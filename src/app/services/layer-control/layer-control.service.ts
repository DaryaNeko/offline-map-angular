import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import * as L from 'leaflet';

@Injectable({
  providedIn: 'root',
})
export class LayerControlService {
  private layersControl: L.Control.Layers | null = null;
  private baseLayers: { [name: string]: L.TileLayer } = {};
  private layers: { [name: string]: L.Layer } = {};
  private map: L.Map | null = null;

  constructor(private http: HttpClient) {}

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
      .layers(this.baseLayers, this.layers, {
        position,
        collapsed,
      })
      .addTo(map);

    this.initBaseLayers();

    this.http
      .get('/assets/countries-raster.mbtiles', { responseType: 'arraybuffer' })
      .toPromise()
      .then((response) => {
        this.addLayer(
          'mbtile',
          (L.tileLayer as any).mbTiles(response, {}) as L.Layer
        );
      });
  }

  async loadMBTiles(): Promise<void> {
    try {
      // Загружаем файл как ArrayBuffer
      const arrayBuffer = await this.http
        .get('./assets/countries-raster.mbtiles', {
          responseType: 'arraybuffer',
        })
        .toPromise();

      if (arrayBuffer) {
        this.createMBTilesLayer(arrayBuffer);
      }
    } catch (error) {
      console.error('Error loading MBTiles file:', error);
    }
  }

  private createMBTilesLayer(arrayBuffer: ArrayBuffer): void {
    try {
      const mbtilesLayer = (L.tileLayer as any).mbtiles(arrayBuffer, {
        minZoom: 0,
        maxZoom: 18,
        attribution: 'MBTiles Data',
      });

      mbtilesLayer.addTo(this.map);

      // Обработчики событий
      mbtilesLayer.on('ready', () => {
        console.log('MBTiles layer ready');
        const bounds = mbtilesLayer.getBounds();
        if (bounds && bounds.isValid()) {
          (this.map as L.Map).fitBounds(bounds);
        }
      });

      mbtilesLayer.on('error', (error: any) => {
        console.error('MBTiles error:', error);
      });
    } catch (error) {
      console.error('Error creating MBTiles layer:', error);
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

  removeLayer(name: string, isBaseLayer: boolean = true): void {
    if (!this.layersControl) return;

    if (isBaseLayer && this.baseLayers[name]) {
      delete this.baseLayers[name];
    } else if (!isBaseLayer && this.layers[name]) {
      delete this.layers[name];
    }
    this.updateLayersControl();
  }

  private updateLayersControl(): void {
    if (!this.layersControl) return;

    const map = this.map;
    if (!map) return;

    const position = this.layersControl.options.position;
    const collapsed = this.layersControl.options.collapsed;

    this.layersControl.remove();
    this.layersControl = L.control
      .layers(this.baseLayers, this.layers, {
        position,
        collapsed,
      })
      .addTo(map);
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
