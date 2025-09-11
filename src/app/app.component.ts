import { Component, AfterViewInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MapService } from './services/map/map.service';
import { LayerControlService } from './services/layer-control/layer-control.service';
import initSqlJs from 'sql.js';
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
    initSqlJs({
      // Required to load the wasm binary asynchronously. Of course, you can host it wherever you want
      // You can omit locateFile completely when running in node
      locateFile: (file: any) => `/mobile/assets/sql-wasm.wasm`,
    }).then((sql) => {
      (window as any).SQL = sql;

      this.mapService.initializeMap('main-map');
    });
  }

  onAddLayerClick(e: Event) {}
}
