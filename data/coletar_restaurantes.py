"""
Coleta restaurantes reais de São Paulo via OpenStreetMap (Overpass API)
e enriquece com dados mockados (menu, stars, reviews).

Rode na sua máquina:
  pip3 install requests
  python3 coletar_restaurantes.py
"""

import requests
import json
import random
import time

random.seed(42)

# ── Overpass query ────────────────────────────────────────────────────────────
# Busca restaurantes, cafés, bares e fast food dentro do município de SP
OVERPASS_URL = "https://overpass-api.de/api/interpreter"
QUERY = """
[out:json][timeout:90];
area["name"="São Paulo"]["admin_level"="8"]->.sp;
(
  node["amenity"="restaurant"](area.sp);
  node["amenity"="cafe"](area.sp);
  node["amenity"="bar"](area.sp);
  node["amenity"="fast_food"](area.sp);
);
out body 2000;
"""

# ── Mapeamento de culinária OSM → nossa categoria ─────────────────────────────
CUISINE_MAP = {
    "pizza":            "Pizza",
    "italian":          "Italiana",
    "japanese":         "Japonesa",
    "sushi":            "Japonesa",
    "ramen":            "Japonesa",
    "brazilian":        "Brasileira",
    "regional":         "Brasileira",
    "barbecue":         "Churrasco",
    "churrasco":        "Churrasco",
    "burger":           "Americana",
    "american":         "Americana",
    "sandwich":         "Americana",
    "french":           "Francesa",
    "mexican":          "Mexicana",
    "arab":             "Árabe",
    "arabic":           "Árabe",
    "lebanese":         "Árabe",
    "middle_eastern":   "Árabe",
    "seafood":          "Frutos do Mar",
    "fish":             "Frutos do Mar",
    "vegan":            "Vegana",
    "vegetarian":       "Vegana",
    "peruvian":         "Peruana",
    "coffee":           "Café",
    "cafe":             "Café",
    "bakery":           "Padaria",
    "pastry":           "Padaria",
    "contemporary":     "Contemporânea",
    "fusion":           "Contemporânea",
    "international":    "Contemporânea",
    "chinese":          "Asiática",
    "korean":           "Asiática",
    "thai":             "Asiática",
    "vietnamese":       "Asiática",
    "asian":            "Asiática",
}

DEFAULT_CUISINES = [
    "Brasileira", "Italiana", "Japonesa", "Pizza", "Americana",
    "Churrasco", "Árabe", "Francesa", "Vegana", "Contemporânea",
    "Frutos do Mar", "Mexicana", "Padaria", "Café", "Peruana",
    "Asiática",
]

# ── Bairros de SP com coordenadas (fallback quando OSM não tem bairro) ─────────
BAIRROS_COORDS = {
    (-23.57, -46.69): "Pinheiros",
    (-23.56, -46.69): "Vila Madalena",
    (-23.58, -46.68): "Itaim Bibi",
    (-23.57, -46.66): "Jardins",
    (-23.60, -46.66): "Moema",
    (-23.60, -46.69): "Vila Olímpia",
    (-23.56, -46.64): "Bela Vista",
    (-23.55, -46.66): "Consolação",
    (-23.56, -46.64): "Liberdade",
    (-23.52, -46.71): "Lapa",
    (-23.54, -46.66): "Perdizes",
    (-23.54, -46.65): "Santa Cecília",
    (-23.54, -46.66): "Higienópolis",
    (-23.62, -46.69): "Brooklin",
    (-23.53, -46.57): "Tatuapé",
    (-23.56, -46.60): "Mooca",
    (-23.58, -46.64): "Paraíso",
    (-23.58, -46.63): "Aclimação",
    (-23.53, -46.68): "Pompeia",
    (-23.59, -46.64): "Vila Mariana",
}

def guess_borough(lat, lng):
    """Guess borough from coordinates."""
    best = "São Paulo"
    best_dist = 999
    for (blat, blng), name in BAIRROS_COORDS.items():
        dist = ((lat - blat) ** 2 + (lng - blng) ** 2) ** 0.5
        if dist < best_dist:
            best_dist = dist
            best = name
    return best

def map_cuisine(osm_cuisine):
    if not osm_cuisine:
        return random.choice(DEFAULT_CUISINES)
    for key, value in CUISINE_MAP.items():
        if key in osm_cuisine.lower():
            return value
    return random.choice(DEFAULT_CUISINES)

# ── Menus por culinária ───────────────────────────────────────────────────────
MENUS = {
    "Brasileira": ["Feijoada completa","Arroz com feijão","Frango assado","Bife acebolado","Moqueca de peixe","Vatapá","Acarajé","Coxinha","Pão de queijo","Brigadeiro","Pudim de leite","Quibe frito","Mandioca frita","Farofa","Picanha grelhada","Costela no bafo","Bolinho de bacalhau"],
    "Italiana": ["Spaghetti carbonara","Fettuccine ao molho branco","Lasanha bolonhesa","Risotto de funghi","Penne all'arrabbiata","Gnocchi ao sugo","Ravioli de ricota","Tagliatelle ao pesto","Pizza margherita","Bruschetta","Caprese","Tiramisu","Panna cotta","Frango à parmegiana","Ossobuco","Carpaccio","Macarrão ao alho e óleo"],
    "Japonesa": ["Sushi de salmão","Sashimi de atum","Temaki de camarão","Uramaki california","Hot roll","Ramen de shoyu","Ramen de missô","Udon","Soba","Gyoza","Edamame","Yakisoba","Frango teriyaki","Tonkatsu","Miso soup","Karaage","Tempura de legumes","Onigiri"],
    "Árabe": ["Shawarma de frango","Shawarma de carne","Falafel","Homus","Esfiha aberta","Esfiha fechada","Quibe cru","Quibe frito","Tabule","Fattoush","Coalhada seca","Kafta grelhada","Baklava","Pão sírio","Frango com especiarias","Arroz árabe"],
    "Americana": ["Smash burger","Cheeseburger duplo","Bacon burger","Chicken sandwich","Hot dog artesanal","Buffalo wings","Onion rings","Mac and cheese","Club sandwich","Milkshake de baunilha","Apple pie","Brownie com sorvete","Waffle","BBQ ribs","Pulled pork"],
    "Mexicana": ["Tacos de carnitas","Tacos de peixe","Burrito de frango","Quesadilla","Nachos com guacamole","Enchiladas","Fajitas de carne","Chili con carne","Guacamole artesanal","Sopa de tortilla","Tamales","Churros com doce de leite","Arroz mexicano","Feijão refrito"],
    "Francesa": ["Croissant de presunto e queijo","Quiche lorraine","Soupe à l'oignon","Coq au vin","Boeuf bourguignon","Confit de canard","Ratatouille","Salade niçoise","Crêpe suzette","Mousse de chocolate","Crème brûlée","Macarons","Tarte tatin","Steak frites"],
    "Peruana": ["Ceviche clássico","Ceviche de camarão","Lomo saltado","Aji de gallina","Causa limeña","Anticuchos","Papa a la huancaína","Tiradito","Arroz con leche","Picarones","Suspiro limeño","Leche de tigre","Chupe de camarones","Pisco sour"],
    "Vegana": ["Bowl de quinoa e legumes","Hambúrguer de grão de bico","Risotto de cogumelos","Curry de grão de bico","Pad thai vegano","Lasanha de berinjela","Wrap de falafel","Açaí bowl","Smoothie bowl","Moqueca de banana da terra","Strogonoff de cogumelos","Sopa de lentilha","Salada de kale com tahine"],
    "Frutos do Mar": ["Moqueca de camarão","Moqueca de peixe","Camarão na moranga","Polvo grelhado","Lula à dorê","Casquinha de siri","Bacalhau à brás","Salmão grelhado","Atum selado","Ceviche de frutos do mar","Camarão alho e óleo","Lagosta grelhada","Ostras frescas","Bobó de camarão"],
    "Churrasco": ["Picanha na brasa","Costela no bafo","Fraldinha grelhada","Maminha ao ponto","Alcatra temperada","Linguiça artesanal","Coração de frango","Frango na grelha","Cordeiro assado","Espetinho de carne","Mandioca assada","Queijo coalho grelhado","Farofa de bacon","Cupim assado"],
    "Pizza": ["Pizza margherita","Pizza calabresa","Pizza quatro queijos","Pizza portuguesa","Pizza frango com catupiry","Pizza pepperoni","Pizza napolitana","Pizza de rúcula com parma","Pizza de cogumelos","Pizza de camarão","Pizza de brigadeiro","Calzone","Pão de alho recheado","Focaccia de alecrim"],
    "Contemporânea": ["Tartar de atum com abacate","Vieira com purê de couve-flor","Risotto de trufas","Pato com molho de laranja","Polvo com batata-doce","Ravioli de lagosta","Sorvete de azeite com sal grosso","Cheesecake desconstruído","Filé mignon com foie gras","Burrata com tomate heirloom","Carne wagyu grelhada","Espuma de maracujá","Menu degustação"],
    "Padaria": ["Croissant de manteiga","Pão de fermentação natural","Baguette","Pão integral artesanal","Focaccia de alecrim","Ciabatta","Pão de queijo mineiro","Sonho de creme","Bomba de chocolate","Coxinha de frango","Pastel de nata","Torta de frango","Bolo de cenoura com brigadeiro","Tapioca"],
    "Asiática": ["Frango xadrez","Rolinho primavera","Arroz chop suey","Frango agridoce","Pad thai","Curry verde tailandês","Pho","Banh mi","Bibimbap","Bulgogi","Dim sum","Dumpling de porco","Lámen apimentado","Frango ao curry","Bao de costela"],
    "Café": ["Espresso","Cappuccino","Flat white","Latte macchiato","Cold brew","Affogato","Café coado especial","Chemex","V60","Matcha latte","Chocolate quente belga","Croissant de amêndoas","Bolo de limão","Avocado toast","Granola com iogurte"],
}

DESCRIPTIONS = [
    "Ambiente aconchegante com cardápio variado e atendimento personalizado.",
    "Especialidade em pratos autorais com ingredientes locais e sazonais.",
    "Reconhecido pelos melhores críticos gastronômicos de São Paulo.",
    "Espaço descontraído ideal para almoços de negócios e jantares em família.",
    "Fusão criativa entre tradição e modernidade no coração da cidade.",
    "Ingredientes frescos selecionados diariamente da CEAGESP.",
    "Cardápio executivo completo com opções vegetarianas e veganas.",
    "Bar premiado com carta de vinhos importados e drinques autorais.",
    "Delivery disponível. Reservas recomendadas para fins de semana.",
    "Ambiente pet-friendly com terraço aberto e música ao vivo às sextas.",
    "Referência em sua cozinha há mais de 20 anos no bairro.",
    "Chef formado na Europa traz técnicas clássicas com toque brasileiro.",
    "Premiado pelo Guia Quatro Rodas e Veja Comer & Beber.",
    "Brunch aos domingos das 10h às 15h. Não aceita reservas.",
    "Cozinha aberta onde o cliente acompanha o preparo dos pratos.",
    "Ingredientes orgânicos e produtores locais parceiros.",
]

# ── Main ──────────────────────────────────────────────────────────────────────
print("🔍 Coletando restaurantes do OpenStreetMap...")
print("   (pode levar 30-60 segundos)\n")

try:
    headers = {"User-Agent": "WhatsCookingSP/1.0 (demo MongoDB Atlas Search)"}
    response = requests.post(OVERPASS_URL, data=QUERY, timeout=120, headers=headers)
    response.raise_for_status()
    osm_data = response.json()
    elements = osm_data.get("elements", [])
    print(f"✅ {len(elements)} locais encontrados no OSM")
except Exception as e:
    print(f"❌ Erro ao buscar OSM: {e}")
    print("   Verifique sua conexão com a internet")
    exit(1)

# ── Process elements ──────────────────────────────────────────────────────────
restaurants = []
seen_names = set()

for el in elements:
    tags = el.get("tags", {})
    name = tags.get("name", "").strip()

    # Skip unnamed or duplicate
    if not name or name in seen_names:
        continue
    seen_names.add(name)

    lat = el.get("lat")
    lng = el.get("lon")
    if not lat or not lng:
        continue

    # Address
    street = tags.get("addr:street", "")
    housenumber = tags.get("addr:housenumber", "")
    street_full = f"{street}, {housenumber}".strip(", ") if street else ""
    zipcode = tags.get("addr:postcode", f"{random.randint(1000,9999):04d}-{random.randint(10,99):02d}0")

    # Borough
    borough = (
        tags.get("addr:suburb") or
        tags.get("addr:neighbourhood") or
        tags.get("addr:quarter") or
        guess_borough(lat, lng)
    )

    # Cuisine
    cuisine = map_cuisine(tags.get("cuisine", ""))

    # Phone / website
    phone = tags.get("phone") or tags.get("contact:phone") or f"+55 11 {random.randint(3000,9999)}-{random.randint(1000,9999)}"
    website = tags.get("website") or tags.get("contact:website") or f"https://{name.lower().replace(' ','')[:20]}.com.br"

    # Mocked enrichment
    stars = round(random.triangular(2.5, 5.0, 4.2), 1)
    menu_pool = MENUS.get(cuisine, MENUS["Brasileira"])

    restaurants.append({
        "name": name,
        "cuisine": cuisine,
        "borough": borough,
        "description": random.choice(DESCRIPTIONS),
        "address": {
            "street": street_full or f"Endereço não disponível",
            "zipcode": zipcode,
            "city": "São Paulo",
            "state": "SP",
        },
        "location": {
            "type": "Point",
            "coordinates": [round(lng, 6), round(lat, 6)],
        },
        "stars": stars,
        "reviews": random.randint(10, 5000),
        "price_range": random.randint(1, 4),
        "open_now": random.choice([True, True, True, False]),
        "phone": phone,
        "website": website,
        "menu": random.sample(menu_pool, min(random.randint(8, 14), len(menu_pool))),
    })

print(f"✅ {len(restaurants)} restaurantes processados (com nome e coordenadas)")

# ── Save ──────────────────────────────────────────────────────────────────────
output_file = "restaurants_sp_enriched.json"
with open(output_file, "w", encoding="utf-8") as f:
    json.dump(restaurants, f, ensure_ascii=False, indent=2)

print(f"✅ Salvo em: {output_file}")

# Summary
from collections import Counter
print("\nPor culinária:")
for cuisine, count in sorted(Counter(r["cuisine"] for r in restaurants).items(), key=lambda x: -x[1]):
    print(f"  {cuisine}: {count}")

print(f"\nTotal final: {len(restaurants)} restaurantes")
print("\nPróximo passo: rode o mongoimport com esse arquivo!")