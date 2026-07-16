#!/bin/bash

mkdir -p public/flyers

assets=(
  "b79220d3e6196f9bae6e53a28f3785e28045ad5f.png"
  "e98ab0e46e6146f85601b313e16be3486f78a242.png"
  "0f2b4899c6530e7404cc246285038c14beb883d5.png"
  "4c0f9942ebd449e7153c1fc5c920d820cb22d3fa.png"
  "45235f26e71139508e5fc6ca8b59a096159f68d3.png"
  "8fdca86ff6a5a129b7f7c9437a14b18835392c3b.png"
  "f298ce663fad105c297925dd2da4266cc46bea9b.png"
  "6279f9ff3723000df648dc864dc96a9a2502a234.png"
  "81ccb365bb278dfa295d16bfaca43a16016df7ba.png"
  "511e59b03811808892f0611ece39d656b83d56bf.png"
  "84154ad3233bab6f86099cc57edee53f83c4a612.png"
  "43279a70d54cd1bca3e11ef6c2e8e67d92ff8f28.png"
  "091a648bd5bee5afe85a9e6be8711a55fc450719.png"
)

index=1
for asset in "${assets[@]}"; do
  url="http://127.0.0.1:3845/assets/$asset"
  output="public/flyers/flyer-$index.png"
  echo "Downloading $url to $output..."
  curl -s -L "$url" -o "$output"
  index=$((index+1))
done

echo "Done!"
