import { Injectable } from '@angular/core';
import { WithDbService } from '../with-db/with-db.service';

import SPL, { Db } from 'spl.js';
import L from 'leaflet';

@Injectable({
  providedIn: 'root'
})

// https://github.com/jvail/spl.js/blob/main/doc/spatialite_functions.md
export class CachedGeoService extends WithDbService {
  protected db: Promise<Db> | undefined;
  protected data: Promise<ArrayBuffer> | undefined;

  private map: L.Map | null = null;
  private control: L.Control | null = null;

  protected layer: { key: string, path: string } = { key: 'rs', path: '/mobile/assets/rs.geojson' }

  constructor() {
    super('identityStorage', 'layers', 'name');
  }

  async initCache(map: L.Map) {
    this.map = map;

    this.map.on('identify', (e) => { console.log(e); })

    map.on('click', (e) => {
      var lat = e.latlng.lat; // Get the latitude
      var lng = e.latlng.lng; // Get the longitude

      this.identify(lat, lng)

      L.popup()
        .setLatLng(e.latlng)
        .setContent("Coordinates: " + lat.toFixed(4) + ", " + lng.toFixed(4))
        .openOn(map);
    });

    let control = L.Control.extend({
      onAdd: (map: L.Map) => {
        var button = L.DomUtil.create('button');
        button.title = 'Закешировать';
        button.innerText = 'Скачать данные для идентификации';
        button.onclick = (e) => {
          this.saveToIndexedDb();
        }

        return button;
      },
      onRemove: () => {
      }
    });

    this.control = new control({ position: 'topright' }).addTo(this.map);

    if (!this.data) {
      this.data = this.getDataFromIDB(this.layer.key).then((d) => {
        console.log(`Загрузка из indexedDB: ${d}`)
        if (d) {
          return d as ArrayBuffer;
        } else {
          return fetch(this.layer.path).then((res) => { return res.arrayBuffer(); });
        }
      }).catch((error) => {
        console.error(error);
        throw error;
      });
    }

    if (!this.db) {
      this.db = new Promise((resolve, reject) => {
        this.data?.then((data) => {
          return SPL().then((spl) => {
            return spl.mount('data', [{
              name: this.layer.key + '.geojson',
              data: data ?? ""
            }]).then((spl) => {
              resolve(spl.db().read(`
                    SELECT InitSpatialMetaDataFull(1);
                    SELECT ImportGeoJSON('/data/${this.layer.key}.geojson', '${this.layer.key}', 'shape', true, 4326, 'LOWER');
                `));
            }).catch((error) => {
              console.error(error);
              reject();
            });
          });
        });
      });
    }

    let db = await this.db;
    const result = await db.exec(`
    SELECT primarykey, НомерРазрешения, shape
    FROM ${this.layer.key}
    WHERE ST_Intersects(shape, GeomFromText('POINT(0 51)', 4326)) = 1;
  `).get.rows;
    console.log(result);
  }

  async saveToIndexedDb() {
    await fetch(this.layer.path)
      .then((res) => { return res.arrayBuffer(); })
      .then((arrayBuffer) => {
        return this.saveDataToIDB(this.layer.key, arrayBuffer);
      });
  }

  async identify(lat: any, lng: any) {
    if (this.db) {
      let db = await this.db;
      const result = await db.exec(`
    SELECT primarykey, НомерРазрешения, shape
    FROM ${this.layer.key}
    WHERE ST_Intersects(shape, GeomFromText('POINT(${lng} ${lat})', 4326)) = 1;   
  `).get.rows;

    console.log(result);
      result.forEach((r) => {
        if (this.map) {
          var geojsonLayer = L.geoJSON(r[2]).addTo(this.map);
        }
      });

      return result;
    } else return null;
  }
}
