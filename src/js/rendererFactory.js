/*
 * rendererFactory.js
 *
 * -------
 * Copyright 2015 Patrick Engineering Inc. All rights reserved.
 */

define(
  [
    'dojo/_base/lang',
    'esri/renderers/UniqueValueRenderer',
    "esri/symbols/SimpleLineSymbol",
    "esri/Color"
  ], function(lang, UniqueValueRenderer, SimpleLineSymbol, Color) {
    'use strict';

    // these are colors that show up reasonably well on top of both
    // topo and aerial maps
    var DISPLAY_COLORS = [
      'rgb(36, 170, 242)',
      'rgb(249, 240, 0)',
      'rgb(113, 252, 108)',
      'rgb(252, 149, 108)',
      'rgb(226, 93, 128)'
    ];

    return {
      randomColorLineRenderer: function(attributeField, values, width) {
        var defaultSymbol = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID)
          .setWidth(width);
        var renderer = new UniqueValueRenderer(defaultSymbol, attributeField);
        var numValues = values.length;
        var stops = [];
        for (var i=0; i<numValues; i++) {
          var value = values[i];
          var color = this._generateRandomColor(0.9);
          stops.push({
            value: value,
            color: color
          });
        }
        renderer.setColorInfo({
          field: attributeField,
          stops: stops
        });
        return renderer;
      },
      _generateRandomColor: function(alpha) {
        // limit to 40-210 --- don't want whites or blacks
        var r = Math.floor((Math.random() * 210) + 40);
        var g = Math.floor((Math.random() * 210) + 40);
        var b = Math.floor((Math.random() * 210) + 40);
        return new Color([r,g,b,alpha]);
      },
      _generateDisplayColors: function(numColors) {
        var colors = [];
        var selectionArray = [];
        for (var i=0; i<numColors; i++) {
          if (!selectionArray.length) {
            selectionArray = DISPLAY_COLORS.slice(); //copy
            this._shuffle(selectionArray);
          }
          colors.push(selectionArray.pop());
        }
        return colors;
      },
      rampedColorLineRenderer: function(attributeField, values, width) {
        var defaultSymbol = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID)
          .setWidth(width);
        var renderer = new UniqueValueRenderer(defaultSymbol, attributeField);
        var minValue = Math.min.apply(Math, values);
        var maxValue = Math.max.apply(Math, values);
        renderer.setColorInfo({
          field: attributeField,
          minDataValue: minValue,
          maxDataValue: maxValue,
          colors: [
            new Color([0, 255, 0, 0.9]), // GREEN
            new Color([0, 0, 255, 0.9]) // BLUE
          ]
        });
        return renderer;
      },
      displayColorSelectedLineRenderer: function(attributeField, selectedField, values, width, selectedWidth) {
        var defaultSymbol = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID)
          .setWidth(width);
        var renderer = new UniqueValueRenderer(defaultSymbol, attributeField, selectedField, null, ",");
        var numValues = values.length;
        var colors = this._generateDisplayColors(numValues);
        for (var i=0; i<numValues; i++) {
          var value = values[i];
          var color = colors[i];
          renderer.addValue({
            value: [value, 0].toString(),
            symbol: new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID)
              .setWidth(width)
              .setColor(color)
          });
          renderer.addValue({
            value: [value, 1].toString(),
            symbol: new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID)
              .setWidth(selectedWidth)
              .setColor(color)
          });
        }
        return renderer;
      },
      _shuffle: function(array) {
        // http://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
        var currentIndex = array.length, temporaryValue, randomIndex ;

        // While there remain elements to shuffle...
        while (0 !== currentIndex) {

          // Pick a remaining element...
          randomIndex = Math.floor(Math.random() * currentIndex);
          currentIndex -= 1;

          // And swap it with the current element.
          temporaryValue = array[currentIndex];
          array[currentIndex] = array[randomIndex];
          array[randomIndex] = temporaryValue;
        }

        return array;
      }
    };
  }
);
