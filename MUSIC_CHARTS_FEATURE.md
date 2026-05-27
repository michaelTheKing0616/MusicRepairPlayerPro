# 🎵 Music Charts Feature

## Overview

The Music Charts feature allows users to view music charts filtered by region and genre, similar to Spotify's Top Charts or Apple Music's Top Charts.

---

## Features

### ✅ Implemented

1. **Charts by Region**
   - 22+ regions supported (Global, US, UK, Canada, Australia, etc.)
   - Easy region selection via dropdown menu

2. **Charts by Genre**
   - 17+ genres (Pop, Rock, Hip-Hop, K-Pop, Afrobeat, etc.)
   - "All Genres" option for top charts

3. **Chart Display**
   - Track position with change indicators (↑↓)
   - Track title, artist, album
   - Weeks on chart
   - Peak position
   - Previous position tracking

4. **Interactive Features**
   - Pull-to-refresh
   - Tap track to play (ready for integration)
   - Visual position change indicators
   - Caching (1 hour cache duration)

---

## Files Created

### Mobile
1. `mobile/src/services/musicChartsService.ts` - Charts service with API integration
2. `mobile/src/screens/MusicChartsScreen.tsx` - Charts screen with filters

### Backend
3. `backend-comprehensive/src/api/charts.routes.ts` - Charts API routes
4. `backend-comprehensive/src/controllers/charts.controller.ts` - Charts controller

---

## Usage

### In Navigation

The Charts tab is now available in the bottom tab navigator:
- Icon: `chart-line`
- Title: "Charts"
- Position: Between "Identify" and "Recent"

### User Flow

1. Open "Charts" tab
2. Select region from dropdown (e.g., "United States")
3. Select genre from dropdown (e.g., "Pop" or "All Genres")
4. View top tracks with positions and stats
5. Tap any track to play (when integrated)

---

## API Integration

### Endpoint

```
GET /api/charts?region={region}&genre={genre}
```

**Parameters:**
- `region` (required): Region code (e.g., 'us', 'global', 'uk')
- `genre` (optional): Genre code (e.g., 'pop', 'rock', 'k-pop')

**Response:**
```json
{
  "id": "chart_us_pop",
  "name": "US POP Chart",
  "region": "us",
  "genre": "pop",
  "tracks": [
    {
      "id": "track_id",
      "title": "Song Title",
      "artist": "Artist Name",
      "album": "Album Name",
      "position": 1,
      "previousPosition": 2,
      "peakPosition": 1,
      "weeksOnChart": 15,
      "streams": 1000000
    }
  ],
  "lastUpdated": "2025-01-XX..."
}
```

---

## Supported Regions

- Global
- United States (US)
- United Kingdom (UK)
- Canada (CA)
- Australia (AU)
- Germany (DE)
- France (FR)
- Japan (JP)
- South Korea (KR)
- India (IN)
- Brazil (BR)
- Mexico (MX)
- Spain (ES)
- Italy (IT)
- Netherlands (NL)
- Sweden (SE)
- Norway (NO)
- Denmark (DK)
- Finland (FI)
- Poland (PL)
- South Africa (ZA)
- Nigeria (NG)

---

## Supported Genres

- All Genres
- Pop
- Rock
- Hip-Hop
- R&B
- Country
- Electronic
- Latin
- Jazz
- Classical
- K-Pop
- J-Pop
- Afrobeat
- Reggae
- Folk
- Metal
- Indie

---

## Backend Integration

### Current Status

The backend controller is a placeholder that returns mock data. To implement real charts:

1. **Integrate Chart APIs:**
   - Spotify Charts API
   - Apple Music Charts API
   - Billboard API
   - Last.fm Charts

2. **Data Sources:**
   ```typescript
   // Example integration
   async getCharts(region: string, genre?: string) {
     // Fetch from Spotify
     const spotifyCharts = await spotifyApi.getCharts(region, genre);
     
     // Or fetch from Apple Music
     const appleCharts = await appleMusicApi.getCharts(region, genre);
     
     // Combine and return
     return combineChartData(spotifyCharts, appleCharts);
   }
   ```

3. **Caching:**
   - Charts update daily/weekly
   - Cache in Redis for performance
   - Update cache on schedule

---

## UI Features

### Position Indicators

- **↑ Green**: Moved up in chart
- **↓ Red**: Moved down in chart
- **- Gray**: No change

### Track Card

- Position number (large, primary color)
- Track title (bold)
- Artist name
- Album name (if available)
- Weeks on chart
- Peak position

### Filters

- Region dropdown with flag icons
- Genre dropdown with music icons
- Refresh button
- Auto-refresh on filter change

---

## Future Enhancements

1. **Real-time Updates**
   - WebSocket for live chart updates
   - Push notifications for chart changes

2. **Chart History**
   - View historical chart positions
   - Track movement over time
   - Chart timeline visualization

3. **Personalized Charts**
   - "Your Top Charts" based on listening history
   - "Trending in Your Area"
   - "Friends' Charts"

4. **Chart Types**
   - Daily charts
   - Weekly charts
   - Monthly charts
   - All-time charts

5. **Social Features**
   - Share charts
   - Comment on chart positions
   - Predict chart movements

---

## Testing

### Manual Testing

1. Open Charts tab
2. Select different regions
3. Select different genres
4. Verify track positions and stats
5. Test pull-to-refresh
6. Test track tap (when integrated)

### API Testing

```bash
# Get global charts
curl http://localhost:3000/api/charts?region=global

# Get US Pop charts
curl http://localhost:3000/api/charts?region=us&genre=pop

# Get K-Pop charts
curl http://localhost:3000/api/charts?region=kr&genre=k-pop
```

---

## Integration Notes

### Connect to Player

To make tracks playable, update `handleTrackPress` in `MusicChartsScreen.tsx`:

```typescript
const handleTrackPress = (track: ChartTrack) => {
  // Search for track in library
  // Or navigate to player with track info
  navigation.navigate('AudioPlayer', {
    audioId: track.id,
    // or search by title/artist
  });
};
```

### Connect to Backend

The service uses the centralized API. Ensure:
1. Backend is running on port 3000
2. `/api/charts` endpoint is implemented
3. Authentication token is available (if required)

---

**Music Charts feature is ready to use!** 🎵📊

