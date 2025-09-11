import { Component, AfterViewInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MapService } from './services/map/map.service';
import { LayerControlService } from './services/layer-control/layer-control.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  providers: [{ provide: 'mapService', useValue: MapService }],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements AfterViewInit {
  title = 'isogd-pwa';
  constructor(private mapService: MapService) {}

  ngAfterViewInit(): void {
    this.mapService.initializeMap('main-map');
  }

  onAddLayerClick(e: Event) {}
}
