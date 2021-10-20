# download data from:
# https://simplemaps.com/data/world-cities

# put worldcities.csv next to this script

# launch this script:
# $ python3 second.py

import pandas as pd
import json

df = pd.read_csv('worldcities.csv')

# Create a multiline json
data = json.loads(df.to_json(orient = "records"))

print(data[:2])

output = [{
    'city': line['city'],
    'coordinates': [line['lat'], line['lng']],
    # 'feature_code': line['feature_code'],
    'country': line['iso2'],
    'population': line['population'],
} for line in data]

print(output[:2])

continent = {}
with open('continent.json') as continent_file:
    continent = json.load(continent_file)

# data for json-server
with open('db.json', 'w') as outfile:
    output = { 'cities': output, 'continent': continent }
    json.dump(output, outfile)
