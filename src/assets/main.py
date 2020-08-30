# download data from:
# https://public.opendatasoft.com/explore/dataset/geonames-all-cities-with-a-population-1000/download/?format=json&timezone=UTC&lang=en

# rename file to data.json

# launch this sctipt:
# $ python3 main.py

import json

with open('data.json') as json_file:
    data = json.load(json_file)

    output = [{
        'city': line['fields']['name'],
        'coordinates': line['fields']['coordinates'],
        'feature_code': line['fields']['feature_code'],
        'country': line['fields']['country_code'],
        'population': line['fields']['population'],
    } for line in data]

    with open('cities-population.min.json', 'w') as outfile:
        json.dump(output, outfile)
