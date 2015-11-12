define(["esri/layers/FeatureLayer", "esri/tasks/FeatureSet"],
  function(FeatureLayer, FeatureSet){

  var routeJson = {"fields":[{"alias":"OID","type":"esriFieldTypeOID","name":"OID"},{"alias":"route_id","type":"esriFieldTypeSmallInteger","name":"route_id"},{"alias":"Total_Length","type":"esriFieldTypeDouble","name":"Total_Length"},{"alias":"Total_FiberCost_Crossing_Cost","type":"esriFieldTypeDouble","name":"Total_FiberCost_Crossing_Cost"},{"alias":"Total_FiberCost_Edge_Cost","type":"esriFieldTypeDouble","name":"Total_FiberCost_Edge_Cost"},{"alias":"Total_FiberCost","type":"esriFieldTypeDouble","name":"Total_FiberCost"}],"displayFieldName":"","geometryType":"esriGeometryPolyline","features":[{"geometry":{"paths":[[[-13626827.958,4551767.421300001],[-13626797.0905,4551772.7766999975]],[[-13626797.0905,4551772.7766999975],[-13626782.811999999,4551687.605899997]],[[-13626797.0905,4551772.7766999975],[-13626613.1907,4551798.137000002],[-13626614.4055,4551806.239699997]]]},"attributes":{"OID":1,"route_id":0,"Total_FiberCost_Edge_Cost":3416.304350454599,"Total_FiberCost_Crossing_Cost":500,"Total_Length":807.5121930587246,"Total_FiberCost":3916.304350454599}},{"geometry":{"paths":[[[-13626582.826299999,4551610.9991],[-13626592.04,4551667.954499997]],[[-13626644.8539,4551612.808200002],[-13626651.9299,4551660.205600001]],[[-13626722.749499999,4551651.202200003],[-13626651.9299,4551660.205600001]],[[-13626592.04,4551667.954499997],[-13626651.9299,4551660.205600001]],[[-13626592.04,4551667.954499997],[-13626606.7342,4551755.165399998],[-13626701.6897,4551737.2722999975]]]},"attributes":{"OID":2,"route_id":1,"Total_FiberCost_Edge_Cost":3556.7962747609063,"Total_FiberCost_Crossing_Cost":1500,"Total_Length":1094.3988109401794,"Total_FiberCost":5056.796274760906}}],"spatialReference":{"wkid":102100,"latestWkid":3857}};

  var layerDef = {
      "geometryType": routeJson.geometryType,
      "fields": routeJson.fields,
      "spatialReference": routeJson.spatialReference
  };

  var featureSet = new FeatureSet(routeJson);

  var routes = new FeatureLayer({
      layerDefinition: layerDef,
      featureSet: featureSet
  }, {
      mode: FeatureLayer.MODE_SNAPSHOT
  });

  return routes;
});
