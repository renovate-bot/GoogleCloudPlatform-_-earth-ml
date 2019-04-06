/// <reference types="@types/googlemaps" />

import { Component, ViewChild } from '@angular/core';

import { Location, makeDemoLocations } from './locations'
import { ServerService } from './server.service';

class Overlay {
  constructor(
    public landsat: google.maps.ImageMapType,
    public landcover: google.maps.ImageMapType,
  ) { }
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'Project Earth';
  state = {
    lat: 37.8195428011924,
    lng: -122.49165319668896,
    zoom: 13,
  }

  // @ts-ignore: initialized by Angular.
  @ViewChild('searchBox') searchBox: ElementRef

  // Locations
  locations: Location[] = []

  // Yearly animation
  readonly startYear = 2013
  readonly endYear = 2018
  year = this.startYear
  overlays = new Map<number, Overlay>()  // {year: Overlay}
  yearChangeInterval = 1200  // milliseconds
  animationTimer: NodeJS.Timer | null = null

  // Landcover layer
  landcoverOn = 1.0

  // @ts-ignore: uninitialized value, gets initialized at onMapReady.
  setLocation: (location: Location) => void

  // @ts-ignore: uninitialized value, gets initialized at onMapReady.
  updateOverlays: () => void

  // @ts-ignore: uninitialized value, gets initialized at onMapReady.
  toggleAnimation: (start: boolean) => void

  constructor(private readonly server: ServerService) { }

  onMapReady($map: google.maps.Map) {
    // Initialize functions with closures to include a reference to $map.
    this.initMapMethods($map)

    // Set the map markers for all the locations.
    this.locations = makeDemoLocations()
    // for (let location of this.locations) {
    //   location.marker.setMap($map)
    //   location.marker.addListener('click', () => {
    //     this.setLocation(location)
    //   })
    // }
    this.setLocation(this.locations[0])

    // Initialize the landsat and landcover overlays for every year.
    for (let year = this.startYear; year <= this.endYear; year++) {
      let overlay = {
        landsat: new google.maps.ImageMapType({
          getTileUrl: (tile, zoom) => {
            return this.server.landsatTileURL(tile.x, tile.y, zoom, year)
          },
          tileSize: new google.maps.Size(256, 256),
        }),
        landcover: new google.maps.ImageMapType({
          getTileUrl: (tile, zoom) => {
            return this.server.landcoverTileURL(tile.x, tile.y, zoom, year)
          },
          tileSize: new google.maps.Size(256, 256),
        }),
      }
      this.overlays.set(year, overlay)
    }
    // Set the landcover overlays.
    for (let [_, overlay] of this.overlays) {
      $map.overlayMapTypes.push(overlay.landcover)
    }
    // Set the landsat overlays.
    for (let [_, overlay] of this.overlays) {
      // $map.overlayMapTypes.push(overlay.landsat)
    }
    this.updateOverlays()

    // Start the timelapse animation.
    this.toggleAnimation(true)
  }

  initMapMethods(map: google.maps.Map) {
    this.setLocation = (location: Location) => {
      // Restrict the user movements to stay in bounds.
      map.set('restriction', {
        latLngBounds: location.bounds,
        strictBounds: true,
      })

      map.setZoom(location.zoom)
      map.panTo(location.coords)

      // for (let loc of this.locations)
      //   loc.closeInfoWindow()
      // location.openInfoWindow(map)
    }

    this.updateOverlays = () => {
      // `this.year` is updated from the [(value)]="year" binding in <mat-slider>.
      for (let [year, overlay] of this.overlays) {
        if (this.landcoverOn) {
          overlay.landsat.setOpacity(0)
          overlay.landcover.setOpacity(year <= this.year ? 1 : 0)
        } else {
          overlay.landsat.setOpacity(year <= this.year ? 1 : 0)
          overlay.landcover.setOpacity(0)
        }
      }
    }

    this.toggleAnimation = (start: boolean) => {
      if (start) {
        this.animationTimer = setInterval(() => {
          this.year++
          if (this.year > this.endYear)
            this.year = this.startYear
          this.updateOverlays()
        }, this.yearChangeInterval)
      } else if (this.animationTimer) {
        clearInterval(this.animationTimer)
      }
    }
  }
}
