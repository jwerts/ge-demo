/*
 * this.js
 * "static" container for map/graphic symbology
 * "skeleton" symbols should be cloned with $.extend instead
 * of used directly.
 * If any properties are to be changed on the symbol, then clone it.
 * -------
 * Copyright 2015 Patrick Engineering Inc. All rights reserved.
 */

define(
  [
    'dojo/_base/Color',
    'dojo/_base/array',
    'esri/symbols/SimpleLineSymbol',
    'esri/symbols/SimpleMarkerSymbol',
    'esri/symbols/SimpleFillSymbol',
    "esri/renderers/UniqueValueRenderer",
    "esri/renderers/SimpleRenderer",
    "esri/renderers/ClassBreaksRenderer"
  ], function(Color, array, SimpleLineSymbol, SimpleMarkerSymbol, SimpleFillSymbol,
              UniqueValueRenderer, SimpleRenderer, ClassBreaksRenderer)
    {
    "use strict";

    var BUILDING_SYMBOL_SIZE = 13;
    var USER_BUILDING_SYMBOL_SIZE = 15;

    var BUILDING_PATH = 'M15.5,3.029l-10.8,6.235L4.7,21.735L15.5,27.971l10.8-6.235V9.265L15.5,3.029zM24.988,10.599L16,15.789v10.378c0,0.275-0.225,0.5-0.5,0.5s-0.5-0.225-0.5-0.5V15.786l-8.987-5.188c-0.239-0.138-0.321-0.444-0.183-0.683c0.138-0.238,0.444-0.321,0.683-0.183l8.988,5.189l8.988-5.189c0.238-0.138,0.545-0.055,0.684,0.184C25.309,10.155,25.227,10.461,24.988,10.599z';
    var USER_BUILDING_PATH = 'M15.5,3.029l-10.8,6.235L4.7,21.735L15.5,27.971l10.8-6.235V9.265L15.5,3.029zM15.5,7.029l6.327,3.652L15.5,14.334l-6.326-3.652L15.5,7.029zM24.988,10.599L16,15.789v10.378c0,0.275-0.225,0.5-0.5,0.5s-0.5-0.225-0.5-0.5V15.786l-8.987-5.188c-0.239-0.138-0.321-0.444-0.183-0.683c0.138-0.238,0.444-0.321,0.683-0.183l8.988,5.189l8.988-5.189c0.238-0.138,0.545-0.055,0.684,0.184C25.309,10.155,25.227,10.461,24.988,10.599z';

    return {
      defaultBldgSymbol: new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CIRCLE)
        .setColor("rgba(255, 155, 100, 0.5)")
        .setSize(BUILDING_SYMBOL_SIZE),

      bldgRed: new SimpleMarkerSymbol()
        .setSize(BUILDING_SYMBOL_SIZE)
        .setStyle(SimpleMarkerSymbol.BUILDING_PATH)
        .setPath(BUILDING_PATH)
        .setColor('rgba(255, 0, 0, 1.0)'),

      bldgYellow: new SimpleMarkerSymbol()
        .setSize(BUILDING_SYMBOL_SIZE)
        .setStyle(SimpleMarkerSymbol.BUILDING_PATH)
        .setPath(BUILDING_PATH)
        .setColor('rgba(255, 255, 0, 1.0)'),

      bldgGreen: new SimpleMarkerSymbol()
        .setSize(BUILDING_SYMBOL_SIZE)
        .setStyle(SimpleMarkerSymbol.BUILDING_PATH)
        .setPath(BUILDING_PATH)
        .setColor('rgba(60, 179, 113, 1.0)'),

      bldgLimeGreen: new SimpleMarkerSymbol()
        .setSize(BUILDING_SYMBOL_SIZE)
        .setStyle(SimpleMarkerSymbol.BUILDING_PATH)
        .setPath(BUILDING_PATH)
        .setColor('rgba(5, 234, 107, 1.0)'),

      bldgOrange: new SimpleMarkerSymbol()
        .setSize(BUILDING_SYMBOL_SIZE)
        .setStyle(SimpleMarkerSymbol.BUILDING_PATH)
        .setPath(BUILDING_PATH)
        .setColor('rgba(255, 165, 0, 1.0)'),

      bldgGrey: new SimpleMarkerSymbol()
        .setSize(BUILDING_SYMBOL_SIZE)
        .setStyle(SimpleMarkerSymbol.BUILDING_PATH)
        .setPath(BUILDING_PATH)
        .setColor('rgba(128, 128, 128, 1.0)'),

      userCreatedBldgSymbol: new SimpleMarkerSymbol()
        .setStyle(SimpleMarkerSymbol.STYLE_PATH)
        .setPath(USER_BUILDING_PATH)
        .setSize(USER_BUILDING_SYMBOL_SIZE)
        .setColor('rgba(25, 150, 230, 1.0)'),
        // .setOutline(new SimpleLineSymbol()
        //   .setStyle(SimpleLineSymbol.STYLE_SOLID)
        //   .setColor('rgba(25, 150, 230, 1.0)')
        //   .setWidth(4)
        // ),

      submittedUserCreatedBldgSymbol: new SimpleMarkerSymbol()
      .setStyle(SimpleMarkerSymbol.STYLE_PATH)
      .setPath(USER_BUILDING_PATH)
      .setSize(USER_BUILDING_SYMBOL_SIZE)
      .setColor('rgba(220, 50, 180, 1.0)'),
        // .setOutline(new SimpleLineSymbol()
        //   .setStyle(SimpleLineSymbol.STYLE_SOLID)
        //   .setColor('rgba(220, 50, 180, 1.0)')
        //   .setWidth(4)
        // ),

      getUserCreatedBldgRenderer: function() {
        var renderer = new UniqueValueRenderer(this.userCreatedBldgSymbol, "__SUBMITTED__");
        renderer.addValue(0, this.userCreatedBldgSymbol);
        renderer.addValue(1, this.submittedUserCreatedBldgSymbol);
        return renderer;
      },

      getBldgsRenderer: function() {
        var bldgsRenderer = new UniqueValueRenderer(this.defaultBldgSymbol, "MIP_SELLABILITY_COLOR_FIBER");
        bldgsRenderer.addValue('GREEN', this.bldgGreen);
        bldgsRenderer.addValue('LIME GREEN', this.bldgLimeGreen);
        bldgsRenderer.addValue('ORANGE', this.bldgOrange);
        bldgsRenderer.addValue('YELLOW', this.bldgYellow);
        bldgsRenderer.addValue('RED', this.bldgRed);
        bldgsRenderer.addValue('GREY', this.bldgGrey);
        return bldgsRenderer;
      },

      getUserCreatedRoutesRenderer: function() {
        var renderer = new UniqueValueRenderer(this.routeSymbol, "infrastructure_type");
        renderer.addValue("Aerial", new SimpleLineSymbol()
          .setStyle(SimpleLineSymbol.STYLE_DASH)
          .setWidth(5)
          .setColor('rgba(255, 0, 0, 0.9)')
        );
        renderer.addValue("Underground", new SimpleLineSymbol()
          .setStyle(SimpleLineSymbol.STYLE_SHORTDOT)
          .setWidth(5)
          .setColor('rgba(0, 150, 0, 0.9)')
        );
        renderer.addValue("New", new SimpleLineSymbol()
          .setStyle(SimpleLineSymbol.STYLE_LONGDASHDOT)
          .setWidth(5)
          .setColor('rgba(0, 0, 255, 0.9)')
        );
        return renderer;
      },

      rampedColorLineRenderer: function(attributeField, values, width) {
        var defaultSymbol = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID)
          .setWidth(width)
          .setColor('rgba(0, 150, 0, 0.9)');
        var renderer = new UniqueValueRenderer(defaultSymbol, attributeField);
        var minValue = Math.min.apply(Math, values);
        var maxValue = Math.max.apply(Math, values);
        renderer.setColorInfo({
          field: attributeField,
          minDataValue: minValue,
          maxDataValue: maxValue,
          colors: [
            new Color([255, 0, 0, 0.9]), // RED
            new Color([0, 0, 255, 0.9]) // BLUE
          ]
        });
        return renderer;
      },

      getRouteCutPointsRenderer: function() {
        var defaultSymbol = new SimpleMarkerSymbol()
          .setStyle(SimpleMarkerSymbol.STYLE_CROSS)
          .setSize(14)
          .setColor("RED");
        var renderer = new SimpleRenderer(defaultSymbol);
        return renderer;
      },

      //NOTE: dashed or dot lines won't work with print service as of 10.2.2
      routeSymbol: new SimpleLineSymbol()
        .setStyle(SimpleLineSymbol.STYLE_SOLID)
        .setWidth(5)
        .setColor('rgba(255, 109, 56, 0.9)'),

      //NOTE: dashed or dot lines won't work with print service as of 10.2.2
      lateralsSymbol: new SimpleLineSymbol()
        .setStyle(SimpleLineSymbol.STYLE_SOLID)
        .setWidth(3)
        .setColor('rgba(150, 75, 200, 0.9)'),

      lateralSnappingSymbol: new SimpleMarkerSymbol()
        .setStyle(SimpleMarkerSymbol.STYLE_CROSS)
        .setColor('rgba(79, 194, 84, 0.7)')
        .setSize(13),

      lateralVertexSymbol: new SimpleMarkerSymbol()
        .setStyle(SimpleMarkerSymbol.STYLE_CIRCLE)
        .setSize(10)
        .setColor('rgba(79, 194, 84, 0.7)')

    };
  }
);
