// Watch Video Tutorial https://youtu.be/vhwhPrlxDeg

// ------------------- Data Sources -------------------
var CHIRPS = ee.ImageCollection("UCSB-CHG/CHIRPS/PENTAD"),
  soil = ee.Image("OpenLandMap/SOL/SOL_TEXTURE-CLASS_USDA-TT_M/v02"),
  DEM = ee.Image("USGS/SRTMGL1_003"),
  s2 = ee.ImageCollection("COPERNICUS/S2"),
  modis = ee.ImageCollection("MODIS/006/MCD12Q1");

// ------------------- Defining Study Area -------------------
// Basin boundary from HydroSHEDS
var dataset = ee.FeatureCollection("WWF/HydroSHEDS/v1/Basins/hybas_12");

// Choose the basin: for example, Ganga basin (MAIN_BAS = 4120025450)
var mainID = 4120025450;
var main = dataset.filter(ee.Filter.eq("MAIN_BAS", mainID));
print("No of Subbasins:", main.size());
var aoi = main;

Map.addLayer(aoi, {}, "AOI");
Map.centerObject(aoi);

// ------------------- Define Dates -------------------
var date1 = "2003-01-01";
var date2 = "2018-01-01";

// ------------------- R Factor -------------------
// Sum CHIRPS precipitation over the period, set a default projection,
// resample, and reproject to 10 km.
var current = CHIRPS.filterDate(date1, date2)
  .select("precipitation")
  .sum()
  .clip(aoi)
  .setDefaultProjection("EPSG:4326", null, 5000)
  .resample("bilinear")
  .reproject({ crs: "EPSG:4326", scale: 10000 });
Map.addLayer(current, {}, "Annual Rain", 0);

// Compute yearly R factor using an empirical equation: R = 0.363 * P + 79
var years = ee.List.sequence(2003, 2018); // only one year in this case
var yearlyR = years.map(function (year) {
  var start = ee.Date.fromYMD(year, 1, 1);
  var end = start.advance(1, "year");
  var yearlyPrecip = CHIRPS.filterDate(start, end)
    .select("precipitation")
    .sum()
    .clip(aoi);
  var R = yearlyPrecip.multiply(0.363).add(79);
  return R.set("year", year);
});
var RCollection = ee.ImageCollection(yearlyR);
var R = RCollection.mean();
Map.addLayer(
  R,
  {
    min: 300,
    max: 900,
    palette: ["a52508", "ff3818", "fbff18", "25cdff", "2f35ff", "0b2dab"],
    format: "png",
  },
  "R Factor Map",
  0
);

// ------------------- K Factor -------------------
// Select and clip soil texture data
soil = soil.select("b0").clip(aoi).rename("soil");
Map.addLayer(
  soil,
  {
    min: 0,
    max: 100,
    palette: ["a52508", "ff3818", "fbff18", "25cdff", "2f35ff", "0b2dab"],
  },
  "Soil",
  0
);

// Use an expression to derive K factor from the soil parameter
var K = soil
  .expression(
    "(b('soil') > 11) ? 0.0053" +
      ": (b('soil') > 10) ? 0.0170" +
      ": (b('soil') > 9) ? 0.045" +
      ": (b('soil') > 8) ? 0.050" +
      ": (b('soil') > 7) ? 0.0499" +
      ": (b('soil') > 6) ? 0.0394" +
      ": (b('soil') > 5) ? 0.0264" +
      ": (b('soil') > 4) ? 0.0423" +
      ": (b('soil') > 3) ? 0.0394" +
      ": (b('soil') > 2) ? 0.036" +
      ": (b('soil') > 1) ? 0.0341" +
      ": (b('soil') > 0) ? 0.0288" +
      ": 0"
  )
  .rename("K")
  .clip(aoi);
Map.addLayer(
  K,
  {
    min: 0,
    max: 0.06,
    palette: ["a52508", "ff3818", "fbff18", "25cdff", "2f35ff", "0b2dab"],
  },
  "K Factor",
  0
);

// ------------------- LS Factor -------------------
// Calculate slope (in degrees) from DEM and convert it to percent
var elevation = DEM.select("elevation");
var slope1 = ee.Terrain.slope(elevation).clip(aoi);
var slope = slope1.divide(180).multiply(Math.PI).tan().multiply(100);
Map.addLayer(
  slope,
  {
    min: 0,
    max: 15,
    palette: ["a52508", "ff3818", "fbff18", "25cdff", "2f35ff", "0b2dab"],
  },
  "Slope (%)",
  0
);

// Compute LS factor using a simplified equation
var LS4 = Math.sqrt(500 / 100);
var LS3 = slope.multiply(0.53);
var LS2 = slope.multiply(slope.multiply(0.076));
var LS1 = LS3.add(LS2).add(0.76);
var LS = LS1.multiply(LS4).rename("LS");
Map.addLayer(
  LS,
  {
    min: 0,
    max: 90,
    palette: ["a52508", "ff3818", "fbff18", "25cdff", "2f35ff", "0b2dab"],
  },
  "LS Factor",
  0
);

// ------------------- C Factor -------------------
// Compute NDVI from Sentinel-2 and derive the C factor
s2 = s2.filterDate(date1, date2).median().clip(aoi);
var image_ndvi = s2.normalizedDifference(["B8", "B4"]).rename("NDVI");
Map.addLayer(
  image_ndvi,
  {
    min: 0,
    max: 0.85,
    palette: [
      "FFFFFF",
      "CC9966",
      "CC9900",
      "996600",
      "33CC00",
      "009900",
      "006600",
      "000000",
    ],
  },
  "NDVI",
  0
);

var alpha = ee.Number(-2);
var C1 = image_ndvi.multiply(alpha);
var oneImage = ee.Image(1).clip(aoi);
var C2 = oneImage.subtract(image_ndvi);
var C3 = C1.divide(C2).rename("C3");
var C4 = C3.exp();

var maxC4 = C4.reduceRegion({
  geometry: aoi,
  reducer: ee.Reducer.max(),
  scale: 3000,
  maxPixels: 475160679,
});
var C5 = maxC4.toImage().clip(aoi);
var minC4 = C4.reduceRegion({
  geometry: aoi,
  reducer: ee.Reducer.min(),
  scale: 3000,
  maxPixels: 475160679,
});
var C6 = minC4.toImage().clip(aoi);
var C7 = C4.subtract(C6);
var C8 = C5.subtract(C6);
var C = C7.divide(C8).rename("C");
Map.addLayer(
  C,
  {
    min: 0,
    max: 1,
    palette: [
      "FFFFFF",
      "CC9966",
      "CC9900",
      "996600",
      "33CC00",
      "009900",
      "006600",
      "000000",
    ],
  },
  "C Factor",
  0
);

// ------------------- LULC -------------------
// Get the LULC layer from MODIS and clip to AOI
var lulc = modis
  .filterDate(date1, date2)
  .select("LC_Type1")
  .first()
  .clip(aoi)
  .rename("LULC");
Map.addLayer(lulc, {}, "LULC", 0);

// --------------- Export Data for Mean Soil Erosion Calculation ---------------
// Stack the intermediate factors into one image.
var factorsImage = R.rename("R")
  .addBands(K.rename("K"))
  .addBands(LS.rename("LS"))
  .addBands(C.rename("C"))
  .addBands(lulc.rename("LULC"));

// Reduce the stacked image over each subbasin (in 'aoi') to get mean values.
var subbasinMeans = factorsImage.reduceRegions({
  collection: aoi,
  reducer: ee.Reducer.mean(),
  scale: 1000,
});

// Export the results as a CSV file to your Drive.
Export.table.toDrive({
  collection: subbasinMeans,
  description: "Subbasin_Factor_Means",
  fileFormat: "CSV",
});

print("Exported subbasin mean values for R, K, LS, C, and LULC.");
