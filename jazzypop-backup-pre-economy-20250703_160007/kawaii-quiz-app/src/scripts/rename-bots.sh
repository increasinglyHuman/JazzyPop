#!/bin/bash

# Bot renaming script
# Creates organized names for profile bot faces

SOURCE_DIR="/home/p0qp0q/Downloads"
DEST_DIR="/home/p0qp0q/Documents/Merlin/JazzyPop/src/images/profile-bots"

# Create destination directory
mkdir -p "$DEST_DIR"

# Counter for each category - initialize to 0
declare -A counters
for cat in mustache beard lady-red lady-pink lady-bubblegum eyelash happy angry-fangs angry shocked shy tongue star-eyes heart-eyes money-eyes dizzy crying misc; do
    counters[$cat]=0
done

# Function to generate clean name
get_clean_name() {
    local filename="$1"
    local category=""
    local variant=""
    
    # Extract the descriptive part with priority order
    case "$filename" in
        *"mustache"*)
            category="mustache" ;;
        *"beard"*)
            category="beard" ;;
        *"lady"*"red lipstick"*)
            category="lady-red" ;;
        *"lady"*"pink lipstick"*)
            category="lady-pink" ;;
        *"lady"*"bubble-gum"*)
            category="lady-bubblegum" ;;
        *"eyelashes"*)
            category="eyelash" ;;
        *"happy face"*"smile"*)
            category="happy" ;;
        *"angry"*"fangs"*)
            category="angry-fangs" ;;
        *"emotion growly"*|*"angry"*)
            category="angry" ;;
        *"shock"*"gasp"*)
            category="shocked" ;;
        *"bashful"*"shy"*)
            category="shy" ;;
        *"tongue stuck out"*)
            category="tongue" ;;
        *"star"*"eye"*)
            category="star-eyes" ;;
        *"heart"*"eye"*)
            category="heart-eyes" ;;
        *"dollar"*"eye"*)
            category="money-eyes" ;;
        *"spiral"*"dizzy"*)
            category="dizzy" ;;
        *"anime weeping"*)
            category="crying" ;;
        *)
            category="misc" ;;
    esac
    
    # Increment counter for this category
    ((counters[$category]++))
    
    # Generate final name
    echo "bot-${category}-${counters[$category]}.svg"
}

# Process all bot face files
while IFS= read -r file; do
    if [ -f "$file" ]; then
        new_name=$(get_clean_name "$file")
        cp "$file" "$DEST_DIR/$new_name"
        echo "Copied: $(basename "$file") -> $new_name"
    fi
done < <(find "$SOURCE_DIR" -name "Firefly face of big eye bot*.svg")

echo "Bot faces organized in: $DEST_DIR"
echo "Categories created:"
for key in "${!counters[@]}"; do
    echo "  $key: ${counters[$key]} variants"
done