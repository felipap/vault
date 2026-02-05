#!/bin/bash

# Generate macOS .icns files from PNG sources

generate_icns() {
  local name=$1
  local source="assets/icons/${name}.png"
  local iconset="assets/icons/${name}.iconset"
  local output="assets/icons/${name}.icns"

  mkdir -p "$iconset"

  sips -z 16 16 "$source" --out "$iconset/icon_16x16.png"
  sips -z 32 32 "$source" --out "$iconset/icon_16x16@2x.png"
  sips -z 32 32 "$source" --out "$iconset/icon_32x32.png"
  sips -z 64 64 "$source" --out "$iconset/icon_32x32@2x.png"
  sips -z 128 128 "$source" --out "$iconset/icon_128x128.png"
  sips -z 256 256 "$source" --out "$iconset/icon_128x128@2x.png"
  sips -z 256 256 "$source" --out "$iconset/icon_256x256.png"
  sips -z 512 512 "$source" --out "$iconset/icon_256x256@2x.png"
  sips -z 512 512 "$source" --out "$iconset/icon_512x512.png"
  sips -z 1024 1024 "$source" --out "$iconset/icon_512x512@2x.png"

  iconutil -c icns "$iconset" -o "$output"
  rm -rf "$iconset"

  echo "Generated $output"
}

generate_icns "production"
generate_icns "development"
