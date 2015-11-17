/*
 * RouteEdit.js
 *
 * -------
 * Copyright 2014 Patrick Engineering Inc. All rights reserved.
 */

define(
  [
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/Evented",
    "esri/graphic",
    "esri/graphicsUtils",
    "esri/geometry/geometryEngine",
    "esri/geometry/Polyline",
    "esri/SpatialReference",
    "esri/symbols/SimpleLineSymbol",
    "esri/Color",
    "esri/renderers/SimpleRenderer",
    "esri/layers/GraphicsLayer",
    "data/routes",
    "app/mapStyles",
    "app/rendererFactory",
    "dojo/_base/array",
    "esri/geometry/webMercatorUtils"
  ], function(declare, lang, Evented, Graphic, graphicsUtils,
              geometryEngine, Polyline,
              SpatialReference, SimpleLineSymbol,
              Color, SimpleRenderer, GraphicsLayer,
              routesFeaturelayer, mapStyles, rendererFactory, array, webMercatorUtils) {
    "use strict";

    var SNAPPING_SYMBOL = mapStyles.cutPointSymbol;

    return declare(Evented, {
      constructor: function(map) {
        this.map = map;

        //Layer symbology
        var routeSymbol = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color("blue"), 5);
        var renderer = new SimpleRenderer(routeSymbol);
        this._routesFeatureLayer = routesFeaturelayer;
        this._routesFeatureLayer.setRenderer(renderer);
        this.map.addLayer(this._routesFeatureLayer);

        this._snappingGraphicsLayer = new GraphicsLayer();
        this._snappingGraphicsLayer.setRenderer(new SimpleRenderer(SNAPPING_SYMBOL));
        this.map.addLayer(this._snappingGraphicsLayer);

        this._cutPointGraphicsLayer = new GraphicsLayer();
        this._cutPointGraphicsLayer.setRenderer(new SimpleRenderer(SNAPPING_SYMBOL));
        this.map.addLayer(this._cutPointGraphicsLayer);

        this._explodedPolylineLayer = new GraphicsLayer();
        this.map.addLayer(this._explodedPolylineLayer);

        this._selectedGraphic = null;
        this._selectedOriginalGraphic = null;

        this._routeFeatureClickHandle = null;
        this._mapClickHandle = null;
        this._mapMouseSnapHandle = null;
        this._explodedPolylineClickHandle = null;

        this._mapClickCount = 0;

        this._cutLineStartPoint = null;
        this._cutLine = null;
      },
      enable: function() {
        this._addRouteFeatureClickHandler();
      },
      clear: function() {
        this._removeMouseClickHandler();
        this._removeMapMouseSnapHandler();
        this._removeExplodedPolylineClickHandler();
        this._removeRouteFeatureClickHandler();

        this._selectedGraphic = null;
        this._selectedOriginalGraphic = null;
        for (var i=0; i<this._routesFeatureLayer.graphics.length; i++) {
          var g = this._routesFeatureLayer.graphics[i];
          g.visible = true;
        }
        this._routesFeatureLayer.redraw();
        this._mapClickCount = 0;
        this._cutLine = null;
        this._cutLineStartPoint = null;

        this._cutPointGraphicsLayer.clear();
        this._explodedPolylineLayer.clear();
      },
      _onRouteFeatureClicked: function(e) {
        console.log(e.graphic.geometry);
        this._removeRouteFeatureClickHandler();

        // set full underlying graphic to invisible
        this._selectedOriginalGraphic = e.graphic;
        e.graphic.visible = false;
        this._routesFeatureLayer.redraw();
        this.emit("graphic-selected");

        this._explodedPolylineLayer.clear();
        var ids = [];
        var polylineGcs = e.graphic.geometry;
        if (polylineGcs.spatialReference.wkid !== 4326) {
          polylineGcs = webMercatorUtils.webMercatorToGeographic(e.graphic.geometry);
        }
        var pathPolys = this._explodePolyline(polylineGcs);
        for (var i = 0; i < pathPolys.length; i++) {
          var poly = pathPolys[i];
          var graphic = new Graphic(poly, null, {'pathIndex': i});
          this._explodedPolylineLayer.add(graphic);
          ids.push(i);
        }
        //this._explodedPolylineLayer.setRenderer(rendererFactory.rampedColorLineRenderer('pathIndex', ids, 7));
        this._explodedPolylineLayer.setRenderer(rendererFactory.randomColorLineRenderer('pathIndex', ids, 7));
        this._explodedPolylineLayer.show();
        this._explodedPolylineLayer.redraw();
        this._addExplodedPolylineClickHandler();
      },
      _onExplodedPolylineClicked: function(e) {
        this._selectedGraphic = e.graphic;
        this._removeExplodedPolylineClickHandler();
        this._addMapMouseSnapHandler();
        this._addMouseClickHandler();

        // go ahead and make the point used to select the line the first click point.
        this._snapAndCut(e.mapPoint);

        // prevent original click from immediatedly firing map click handler just added.
        e.stopPropagation();
      },
      _onMapClick: function(e) {
        this._snapAndCut(e.mapPoint);
      },
      _snapAndCut: function(mapPoint) {
        this._mapClickCount++;
        var clickPoint = webMercatorUtils.webMercatorToGeographic(mapPoint);

        if (this._mapClickCount === 1) {
          var snapObj = geometryEngine.nearestCoordinate(this._selectedGraphic.geometry, clickPoint);
          var snapPoint = snapObj.coordinate;
          this._cutLineStartPoint = snapPoint;
          this._cutPointGraphicsLayer.add(new Graphic(snapPoint));
        } else {
          this._removeMapMouseSnapHandler();
          this._removeMouseClickHandler();
          this._explodedPolylineLayer.clear();
          this._snappingGraphicsLayer.clear();

          var startPoint = this._cutPointGraphicsLayer.graphics[0].geometry;
          var endPoint = clickPoint;
          var slicedPolylineSegment = this._cutPolyline(startPoint, endPoint, this._selectedGraphic.geometry);

          this._routesFeatureLayer.remove(this._selectedOriginalGraphic);
          var editedPolyline = this._spliceInCutSegment(this._selectedOriginalGraphic.geometry,
            this._selectedGraphic.attributes.pathIndex, slicedPolylineSegment);
          var editedPolylineSections = this._multiPartToSinglePart(editedPolyline);

          for (var i = 0; i < editedPolylineSections.length; i++) {
            var section = editedPolylineSections[i];
            // TODO: calc attributes from original???
            var sectionGraphic = new Graphic(webMercatorUtils.geographicToWebMercator(section), null, {});
            this._routesFeatureLayer.add(sectionGraphic);
          }

          this._cutPointGraphicsLayer.clear();
          this._routesFeatureLayer.redraw();

          // restart process?
          this.clear();
          this.enable();
        }
      },
      _cutPolyline: function(startPoint, endPoint, polyline) {
        // cuts out portion of polyline between startPoint and endPoint
        // and returns new multi part polyline.
        // expects all inputs in wgs 84.
        // slicing functionality was not available in esri geometryEngine so we make use
        // of Terraformer (convert to geojson) and turfjs (spatial operation).
        var routeGeoJson = new Terraformer.Feature(Terraformer.ArcGIS.parse(polyline));
        var startGeoJson = new Terraformer.Feature(Terraformer.ArcGIS.parse(startPoint));
        var endGeoJson = new Terraformer.Feature(Terraformer.ArcGIS.parse(endPoint));
        var cutter = turf.lineSlice(startGeoJson, endGeoJson, routeGeoJson);
        var cutterPolyline = new Polyline({
          spatialReference: new SpatialReference(4326),
          paths: [cutter.geometry.coordinates]
        });
        var slicedPolyline = geometryEngine.difference(polyline, cutterPolyline);
        return slicedPolyline;
      },
      _spliceInCutSegment: function(originalPolyline, cutPathIndex, slicedPolyline) {
        // replaces the original segment of polyline that was edited with the
        // cut segments.
        var editedPolyline = new Polyline(new SpatialReference(4326));

        var originalPolylineGcs = originalPolyline;
        if (originalPolylineGcs.spatialReference.wkid !== 4326) {
          originalPolylineGcs = webMercatorUtils.webMercatorToGeographic(originalPolyline);
        }
        for (var i = 0; i < originalPolylineGcs.paths.length; i++) {
          var oPath = originalPolylineGcs.paths[i];
          if (i !== cutPathIndex) {
            editedPolyline.addPath(oPath);
          }
        }

        for (var j = 0; j < slicedPolyline.paths.length; j++) {
          var path = slicedPolyline.paths[j];
          editedPolyline.addPath(path);
        }
        return editedPolyline;
      },
      _multiPartToSinglePart: function(polyline) {
        // returns an array of disjoint polylines from a multipart polyline
        var groups = this._groupPolylines(this._explodePolyline(polyline));

        var polylineSegments = [];
        for (var k = 0; k < groups.length; k++) {
          var unioned = geometryEngine.union(groups[k]);
          polylineSegments.push(unioned);
        }
        return polylineSegments;
      },
      _onMapMouseSnap: function(e) {
        // show point on line where mouse cursor snaps to line
        var mapPointGcs = webMercatorUtils.webMercatorToGeographic(e.mapPoint);
        var snapObj = geometryEngine.nearestCoordinate(this._selectedGraphic.geometry, mapPointGcs);
        var snapPoint = snapObj.coordinate;

        if (!this._snappingGraphicsLayer.graphics.length) {
          this._snappingGraphicsLayer.add(new Graphic(snapPoint));
        } else {
          this._snappingGraphicsLayer.graphics[0].geometry = snapPoint;
          this._snappingGraphicsLayer.redraw();
        }
      },
      _explodePolyline: function(polyline) {
        // explodes multi-path polyline into array of polylines
        // with one path each.
        var polys = [];
        for (var i = 0; i < polyline.paths.length; i++) {
          var path = polyline.paths[i];
          var pathPoly = new Polyline({
            paths: [path],
            spatialReference: new SpatialReference(4326)
          });
          polys.push(pathPoly);
        }
        return polys;
      },
      _groupPolylines: function(polylines) {
        // This basically forms a dissolve by testing the polylinges to determine who touches who.
        // it returns [ [polyline, polyline, ...], [polyline, polyline,...] ] where each array contains polylines that touch each other
        // NOTE: This algorithm is O(n^3) which isn't great but the number of polylines will usually be pretty small
        // and it's still better than sending to the server.
        var groups = [];
        for (var i = 0; i < polylines.length; i++) {
          var polyline = polylines[i];
          var inclusiveGroupIndexes = [];

          for (var j = 0; j < groups.length; j++) {
            var group = groups[j];

            for (var k = 0; k < group.length; k++) {
              var testPolyline = group[k];
              // check if it intersects to see if they're touching
              // NOTE: touches function does not return expected results
              // NOTE: !disjoint profiles slightly faster than intersects
              if (!geometryEngine.disjoint(polyline, testPolyline)) {
                inclusiveGroupIndexes.push(j);
                break;
              }
            }
          }
          if (inclusiveGroupIndexes.length === 0) {
            groups.push([polyline]);
          } else if (inclusiveGroupIndexes.length === 1) {
            groups[inclusiveGroupIndexes[0]].push(polyline);
          } else {
            // if it belongs to multiple groups, then those groups should be joined.
            // add to first group and then concat the groups
            //TODO: this logic won't work if inclusiveGroupIndexes.length > 2
            var firstInclusiveIndex = inclusiveGroupIndexes[0];
            groups[firstInclusiveIndex].push(polyline);
            for (var m = 1; m < inclusiveGroupIndexes.length; m++) {
              var additionalInclusiveIndex = inclusiveGroupIndexes[m];
              groups[firstInclusiveIndex] = groups[firstInclusiveIndex].concat(groups[additionalInclusiveIndex]);
              groups.splice(additionalInclusiveIndex, 1);
            }
          }
        }
        return groups;
      },
      _addMouseClickHandler: function() {
        console.log('ADD map click');
        this._mapClickHandle = this.map.on('click', lang.hitch(this, this._onMapClick));
      },
      _removeMouseClickHandler: function() {
        if (this._mapClickHandle) {
          console.log('REMOVE map click');
          this._mapClickHandle.remove();
          this._mapClickHandle = null;
        }
      },
      _addMapMouseSnapHandler: function() {
        console.log('ADD mouse move snap');
        this._mapMouseSnapHandle = this.map.on('mouse-move', lang.hitch(this, this._onMapMouseSnap));
      },
      _removeMapMouseSnapHandler: function() {
        if (this._mapMouseSnapHandle) {
          console.log('REMOVE mouse move snap');
          this._mapMouseSnapHandle.remove();
          this._mapMouseSnapHandle = null;
        }
      },
      _addRouteFeatureClickHandler: function() {
        console.log('ADD route feature click');
        this._routeFeatureClickHandle = this._routesFeatureLayer.on('click', lang.hitch(this, this._onRouteFeatureClicked));
      },
      _removeRouteFeatureClickHandler: function() {
        console.log('REMOVE route feature click');
        if (this._routeFeatureClickHandle) {
          this._routeFeatureClickHandle.remove();
          this._routeFeatureClickHandle = null;
        }
      },
      _addExplodedPolylineClickHandler: function() {
        console.log('ADD exploded polyline click');
        this._explodedPolylineClickHandle = this._explodedPolylineLayer.on('click', lang.hitch(this, this._onExplodedPolylineClicked));
      },
      _removeExplodedPolylineClickHandler: function() {
        if (this._explodedPolylineClickHandle) {
          console.log('REMOVE exploded polyline click');
          this._explodedPolylineClickHandle.remove();
          this._explodedPolylineClickHandle = null;
        }
      },
    });
  }
);
