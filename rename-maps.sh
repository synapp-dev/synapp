#!/bin/bash

# Script to rename map files by removing prefixes and adding -badge suffix
# Run this in Git Bash from the synapp directory

echo "Renaming map files..."

# Navigate to the maps directory
cd "apps/intradark/public/images/steam/maps"

# Function to rename a file
rename_file() {
    local old_name="$1"
    local new_name="$2"
    
    if [ -f "$old_name" ]; then
        echo "Renaming: $old_name -> $new_name"
        mv "$old_name" "$new_name"
    else
        echo "Warning: File $old_name not found"
    fi
}

# Rename De_ files (remove De_ prefix and add -badge suffix)
rename_file "De_ancient.png" "ancient-badge.png"
rename_file "De_anubis.png" "anubis-badge.png"
rename_file "De_brewery.png" "brewery-badge.png"
rename_file "De_dogtown.png" "dogtown-badge.png"
rename_file "De_dust2.png" "dust2-badge.png"
rename_file "De_grail.png" "grail-badge.png"
rename_file "De_inferno.png" "inferno-badge.png"
rename_file "De_jura.png" "jura-badge.png"
rename_file "De_mirage.png" "mirage-badge.png"
rename_file "De_nuke.png" "nuke-badge.png"
rename_file "De_overpass.png" "overpass-badge.png"
rename_file "De_train.png" "train-badge.png"
rename_file "De_vertigo.png" "vertigo-badge.png"

# Rename Cs_ files (remove Cs_ prefix and add -badge suffix)
rename_file "Cs_agency.png" "agency-badge.png"
rename_file "Cs_italy.png" "italy-badge.png"
rename_file "Cs_office.png" "office-badge.png"

# Rename Ar_ files (remove Ar_ prefix and add -badge suffix)
rename_file "Ar_baggage.png" "baggage-badge.png"
rename_file "Ar_pool_day.png" "pool_day-badge.png"
rename_file "Ar_shoots.png" "shoots-badge.png"

# Handle special case for Lobby_map_veto
rename_file "Lobby_map_veto.png" "lobby_map_veto-badge.png"

echo "Map file renaming complete!"
echo ""
echo "New file names:"
ls -la *.png 