import pandas as pd
import geopandas as gpd
import matplotlib.pyplot as plt

df = pd.read_csv("Subbasin_Factor_Means.csv")
print(df.head())

df['Soil_Erosion'] = df['R'] * df['K'] * df['LS'] * df['C']

# Calculate mean soil erosion
mean_soil_erosion = df['Soil_Erosion'].mean()

# Save the processed data for GEE visualization
output_path = "./output/Subbasin_Soil_Erosion.csv"
df.to_csv(output_path, index=False)

print(f"Mean Soil Erosion: {mean_soil_erosion}")
print(f"Processed data saved to: {output_path}")