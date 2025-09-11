import { Injectable, OnDestroy } from '@angular/core';
import * as L from 'leaflet';
import { LayerControlService } from '../layer-control/layer-control.service';

@Injectable({
  providedIn: 'root',
})
export class MapService implements OnDestroy {
  private map: L.Map | null = null;
  private defaultBaseLayer: string = 'OpenStreetMap';

  constructor(private layerControlService: LayerControlService) {}

  initializeMap(
    containerId: string,
    lat: number = 58.010455,
    lng: number = 56.229443,
    zoom: number = 12
  ): void {
    if (this.map) {
      console.warn('Map already initialized');
      return;
    }

    this.fixLeafletIcons();

    this.map = L.map(containerId, { attributionControl: false }).setView(
      [lat, lng],
      zoom
    );

    // Инициализируем контрол слоев
    this.layerControlService.initializeControl(this.map);

    // Добавляем OSM как базовый слой по умолчанию

    const baseLayers = this.layerControlService.getBaseLayers();
    const defaultBaseLayer: L.Layer = baseLayers[this.defaultBaseLayer];
    defaultBaseLayer.addTo(this.map);
  }

  setView(lat: number, lng: number, zoom: number): void {
    if (!this.map) {
      console.error('Map not initialized');
      return;
    }
    this.map.setView([lat, lng], zoom);
  }

  addMarker(lat: number, lng: number, popupText: string = ''): L.Marker {
    if (!this.map) {
      throw new Error('Map not initialized');
    }

    const marker = L.marker([lat, lng]).addTo(this.map);

    if (popupText) {
      marker.bindPopup(popupText);
    }

    return marker;
  }

  getMapInstance(): L.Map | null {
    return this.map;
  }

  isInitialized(): boolean {
    return this.map !== null;
  }

  private fixLeafletIcons(): void {
    delete (L.Icon.Default.prototype as any)._getIconUrl;

    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'assets/marker-icon-2x.png',
      iconUrl: 'assets/marker-icon.png',
      shadowUrl: 'assets/marker-shadow.png',
    });
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }

    this.layerControlService.destroy();
  }
}
