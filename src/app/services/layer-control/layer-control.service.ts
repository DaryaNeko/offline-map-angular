import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import * as L from 'leaflet';
import { MBTiles } from 'leaflet-tilelayer-mbtiles-ts';

@Injectable({
  providedIn: 'root',
})
export class LayerControlService {
  private layersControl: L.Control.Layers | null = null;
  private baseLayers: { [name: string]: L.TileLayer } = {};
  private layers: { [name: string]: L.Layer } = {};
  private map: L.Map | null = null;
  private idbName = 'mbtilesStorage';
  private idbVersion = 1;
  private idb: IDBDatabase | null = null;

  constructor(private http: HttpClient) {
    this.initDatabase();
  }

  initializeControl(
    map: L.Map,
    position:
      | 'topright'
      | 'topleft'
      | 'bottomright'
      | 'bottomleft' = 'topright',
    collapsed: boolean = false
  ): void {
    this.map = map;
    this.layersControl = L.control
      .layers(this.baseLayers, this.layers, { position, collapsed })
      .addTo(map);
    this.initBaseLayers();
    this.initLayers();
  }

  private async initDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.idbName, this.idbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.idb = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('mbtiles')) {
          db.createObjectStore('mbtiles', { keyPath: 'name' });
        }
      };
    });
  }

  private async getLayerFromIDB(name: string): Promise<ArrayBuffer | null> {
    if (!this.idb) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.idb!.transaction(['mbtiles'], 'readonly');
      const store = transaction.objectStore('mbtiles');
      const request = store.get(name);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        resolve(request.result ? request.result.data : null);
      };
    });
  }

  private async saveLayerToIDB(name: string, data: ArrayBuffer): Promise<void> {
    if (!this.idb) return;

    return new Promise((resolve, reject) => {
      const transaction = this.idb!.transaction(['mbtiles'], 'readwrite');
      const store = transaction.objectStore('mbtiles');
      const request = store.put({ name, data });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  private async loadLayerFromFile(
    url: string
  ): Promise<ArrayBuffer | undefined> {
    return this.http.get(url, { responseType: 'arraybuffer' }).toPromise();
  }

  async initLayers() {
    const mbtilesFiles = [
      {
        name: 'countries-raster',
        url: '/mobile/assets/countries-raster.mbtiles',
      },
      {
        name: 'РазрешениеНаВВод',
        url: '/mobile/assets/РазрешениеНаВВод.mbtiles',
      },
    ];

    for (const file of mbtilesFiles) {
      // Проверяем наличие в IndexedDB
      let fileData = (await this.getLayerFromIDB(file.name)) as ArrayBuffer;

      // Если нет в базе - загружаем и сохраняем
      if (!fileData) {
        fileData = (await this.loadLayerFromFile(file.url)) as ArrayBuffer;
        await this.saveLayerToIDB(file.name, fileData);
      }

      // Создаем слой из данных
      const layer = new MBTiles(fileData, {}) as L.TileLayer;

      // Необязательные обработчики на mbtiles
      layer.on('databaseloaded', (ev: any) => {
        console.info('MBTiles DB loaded', ev);
      });
      layer.on('databaseerror', (ev: any) => {
        console.info('MBTiles DB error', ev);
      });

      // Добавляем слой
      this.addLayer(file.name, layer);
    }
  }

  addBaseLayer(name: string, layer: L.TileLayer): void {
    if (!this.layersControl) {
      console.error('Layers control not initialized');
      return;
    }

    this.baseLayers[name] = layer;
    this.layersControl.addBaseLayer(layer, name);
  }

  addLayer(name: string, layer: L.Layer): void {
    if (!this.layersControl) {
      console.error('Layers control not initialized');
      return;
    }

    this.layers[name] = layer;
    this.layersControl.addOverlay(layer, name);
  }

  getControlInstance(): L.Control.Layers | null {
    return this.layersControl;
  }

  getBaseLayers(): { [name: string]: L.TileLayer } {
    return { ...this.baseLayers };
  }

  getLayers(): { [name: string]: L.Layer } {
    return { ...this.layers };
  }

  destroy(): void {
    if (this.layersControl) {
      this.layersControl.remove();
    }
    this.layersControl = null;
    this.baseLayers = {};
    this.layers = {};
  }

  initBaseLayers() {
    // Создаем базовые слои
    const osmLayer = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }
    );

    const satelliteLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution:
          'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxZoom: 19,
      }
    );

    const darkLayer = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 20,
      }
    );

    // Добавляем базовые слои через сервис
    this.addBaseLayer('OpenStreetMap', osmLayer);
    this.addBaseLayer('Спутник', satelliteLayer);
    this.addBaseLayer('Темная тема', darkLayer);
  }
}
