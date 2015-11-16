/*
 * RouteEdit.js
 *
 * -------
 * Copyright 2014 Patrick Engineering Inc. All rights reserved.
 */

var d_map;
var d_routeFeatureLayer;
var d_selectionLayer;

define(
  [
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/Evented",
    "esri/map",
    "esri/graphic",
    "esri/graphicsUtils",
    "esri/geometry/Extent",
    "esri/geometry/geometryEngine",
    "esri/geometry/Polyline",
    "esri/geometry/Point",
    "esri/SpatialReference",

    "esri/symbols/SimpleFillSymbol",
    "esri/symbols/SimpleLineSymbol",
    "esri/symbols/TextSymbol",
    "esri/symbols/Font",
    "esri/Color",
    "esri/renderers/SimpleRenderer",

    "esri/layers/FeatureLayer",
    "esri/layers/GraphicsLayer",
    "data/routes",
    "app/mapStyles",

    "dojo/on",
    "dojo/_base/array",
    "esri/geometry/webMercatorUtils"
  ], function(declare, lang, Evented, Map, Graphic, graphicsUtils, Extent, geometryEngine, Polyline, Point,
              SpatialReference, SimpleFillSymbol, SimpleLineSymbol,
              TextSymbol, Font, Color, SimpleRenderer, FeatureLayer, GraphicsLayer,
              routes, mapStyles, on, array, webMercatorUtils) {
    "use strict";

    var LEFT_CUT_SYMBOL = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color("green"), 5);
    var RIGHT_CUT_SYMBOL = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color('rgb(92, 54, 142)'), 5);
    var UNCUT_SYMBOL = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color('rgb(198, 0, 196)'), 5);

    var SNAPPING_SYMBOL = mapStyles.lateralVertexSymbol;

    return declare(Evented, {
      constructor: function(map) {
        this.map = map;
        d_map = map;

        //Layer symbology
        var routesym = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color("blue"), 3);
        var selectionSym = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color("black"), 5);
        var cutterSym = new SimpleLineSymbol(SimpleLineSymbol.STYLE_DASH, new Color("red"), 2);

        var renderer = new SimpleRenderer(routesym);

        //Get FeatureLayer created from FeatureCollection stored on the client through data/routes
        this._routesFeatureLayer = routes;
        this._routesFeatureLayer.setRenderer(renderer);
        this.map.addLayer(this._routesFeatureLayer);
        d_routeFeatureLayer = this._routesFeatureLayer;

        this._cutterGraphicsLayer = new GraphicsLayer();
        this._cutterGraphicsLayer.setRenderer(new SimpleRenderer(cutterSym));
        this.map.addLayer(this._cutterGraphicsLayer);

        //Create selection layer to display selection symbol
        this._selectionLayer = new GraphicsLayer();
        this._selectionLayer.setRenderer(new SimpleRenderer(selectionSym));
        this.map.addLayer(this._selectionLayer);
        d_selectionLayer = this._selectionLayer;

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

        this._cutterGraphicsLayer.clear();
        this._selectionLayer.clear();
        this._cutterGraphicsLayer.clear();
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
        this._explodedPolylineLayer.setRenderer(mapStyles.rampedColorLineRenderer('pathIndex', ids, 5));
        this._explodedPolylineLayer.show();
        this._explodedPolylineLayer.redraw();
        this._addExplodedPolylineClickHandler();
      },
      _onExplodedPolylineClicked: function(e) {
        //this._explodedPolylineLayer.setVisibility(false);
        //this._explodedPolylineLayer.redraw();

        this._selectedGraphic = new Graphic(e.graphic.toJson());
        this._selectionLayer.add(this._selectedGraphic);
        this._selectionLayer.redraw();

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
        var clickPoint = webMercatorUtils.webMercatorToGeographic(mapPoint);
        this._mapClickCount++;
        var snapObj = geometryEngine.nearestCoordinate(this._selectedGraphic.geometry, clickPoint);
        var snapPoint = snapObj.coordinate;
        console.log("distance", snapObj.distance);
        this._cutLineStartPoint = snapPoint;
        this._cutPointGraphicsLayer.add(new Graphic(snapPoint));

        if (this._mapClickCount === 2) {
          this._removeMapMouseSnapHandler();
          this._removeMouseClickHandler();

          var routeGeographic = this._selectedGraphic.geometry;
          var startPoint = this._cutPointGraphicsLayer.graphics[0].geometry;
          var endPoint = this._cutPointGraphicsLayer.graphics[1].geometry;
          var slicedPolylineSegment = this._cutPolyline(startPoint, endPoint, routeGeographic);

          this._explodedPolylineLayer.clear();
          this._snappingGraphicsLayer.clear();
          this._cutPointGraphicsLayer.clear();

          var editedPolyline = new Polyline(new SpatialReference(4326));

          var originalPolylineGcs = webMercatorUtils.webMercatorToGeographic(this._selectedOriginalGraphic.geometry);
          for (var i = 0; i < originalPolylineGcs.paths.length; i++) {
            var oPath = originalPolylineGcs.paths[i];
            if (i !== this._selectedGraphic.attributes.pathIndex) {
              editedPolyline.addPath(oPath);
            }
          }

          for (var j = 0; j < slicedPolylineSegment.paths.length; j++) {
            var path = slicedPolylineSegment.paths[j];
            editedPolyline.addPath(path);
          }
          //TODO: fill in attributes
          var editedRouteGraphic = new Graphic(editedPolyline, null, {});

          this._routesFeatureLayer.remove(this._selectedOriginalGraphic);
          editedRouteGraphic.geometry = webMercatorUtils.geographicToWebMercator(editedRouteGraphic.geometry);
          this._routesFeatureLayer.add(editedRouteGraphic);
          this._routesFeatureLayer.redraw();

          this._selectionLayer.clear();

          // restart process?
          this.clear();
          this.enable();
        }
      },
      _cutPolyline: function(startPoint, endPoint, polyline) {
        //var selectedGeographic = webMercatorUtils.webMercatorToGeographic(polyline);
        var routeGeoJson = Terraformer.ArcGIS.parse(new Graphic(polyline));
        var startGeoJson = Terraformer.ArcGIS.parse(new Graphic(startPoint));
        var endGeoJson = Terraformer.ArcGIS.parse(new Graphic(endPoint));
        var cutter = turf.lineSlice(startGeoJson, endGeoJson, routeGeoJson);
        var cutterPolyline = new Polyline(new SpatialReference(4326));
        cutterPolyline.addPath(cutter.geometry.coordinates);
        var slicedPolyline = geometryEngine.difference(polyline, cutterPolyline);
        return slicedPolyline;
      },
      _onMouseMove: function(e) {
        this._cutLine = this._createPolyline(this._cutLineStartPoint, e.mapPoint);
        //this._cutLine.addPath([this._cutLine.paths[this._cutLine.paths.length-1][1], clickPoint]);
        this._cutterGraphicsLayer.clear();
        this._cutterGraphicsLayer.add(new Graphic(this._cutLine));
        this._cutPolyline(this._selectedGraphic.geometry);
      },
      _onMapMouseSnap: function(e) {
        var mapPointGcs = webMercatorUtils.webMercatorToGeographic(e.mapPoint);
        var snapObj = geometryEngine.nearestCoordinate(this._selectedGraphic.geometry, mapPointGcs);
        var snapPoint = snapObj.coordinate;
        //this._snappingGraphicsLayer.clear();
        if (!this._snappingGraphicsLayer.graphics.length) {
          this._snappingGraphicsLayer.add(new Graphic(snapPoint));
        } else {
          this._snappingGraphicsLayer.graphics[0].geometry = snapPoint;
          this._snappingGraphicsLayer.redraw();
        }
      },
      _createPolyline: function(pt1, pt2) {
        var pt1Cor = [pt1.x, pt1.y];
        var pt2Cor = [pt2.x, pt2.y];
        var lineJSON = {
            paths: [[pt1Cor, pt2Cor]],
            spatialReference: pt1.spatialReference
        };
        var polyline = new Polyline(lineJSON);
        return polyline;
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
      _explodePolyline: function(polyline) {
        var polys = [];
        for (var i = 0; i < polyline.paths.length; i++) {
          var path = polyline.paths[i];
          var pathPoly = new Polyline(new SpatialReference(4326));
          pathPoly.addPath(path);
          polys.push(pathPoly);
        }
        return polys;
      },
      // _cutPolyline: function(polyline) {
      //   var crosses = geometryEngine.crosses(this._cutLine, polyline);
      //   if (crosses) {
      //     var cutPolylines = geometryEngine.cut(polyline, this._cutLine);
      //
      //     this._selectionLayer.clear();
      //
      //     var leftGraphic = new Graphic(cutPolylines[0], LEFT_CUT_SYMBOL);
      //     var rightGraphic = new Graphic(cutPolylines[1], RIGHT_CUT_SYMBOL);
      //     var untouchedGrahpic = new Graphic(cutPolylines[2], UNCUT_SYMBOL);
      //
      //     this._selectionLayer.add(leftGraphic);
      //     //this._selectionLayer.add(rightGraphic);
      //     this._selectionLayer.add(untouchedGrahpic);
      //   }
      // }
    });
  }
);
