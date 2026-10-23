// Custom Lambda Function
const get = (id) => document.getElementById(id);

// DOM Elements
const searchForm = get('search-form');
const cityInput = get('city-input');
const errorMessage = get('error-message');
const spinner = get('loading-spinner');
const dashboardContent = get('dashboard-content');
const forecastContainer = get('forecast-container');

// Weather Display Elements
const cityNameEl = get('city-name');
const tempEl = get('temperature');
const weatherIconEl = get('weather-icon');
const weatherDescEl = get('weather-desc');
const humidityEl = get('humidity');
const windSpeedEl = get('wind-speed');

// WMO Weather interpretation codes mapped to emojis/descriptions
function getWeatherMeta(code) {
    const codes = {
        0: { desc: 'Clear sky', icon: '☀️' },
        1: { desc: 'Mainly clear', icon: '🌤️' },
        2: { desc: 'Partly cloudy', icon: '⛅' },
        3: { desc: 'Overcast', icon: '☁️' },
        45: { desc: 'Fog', icon: '🌫️' },
        48: { desc: 'Depositing rime fog', icon: '🌫️' },
        51: { desc: 'Light drizzle', icon: '🌦️' },
        53: { desc: 'Moderate drizzle', icon: '🌦️' },
        55: { desc: 'Dense drizzle', icon: '🌧️' },
        61: { desc: 'Slight rain', icon: '🌧️' },
        63: { desc: 'Moderate rain', icon: '🌧️' },
        65: { desc: 'Heavy rain', icon: '🌧️' },
        71: { desc: 'Slight snow', icon: '❄️' },
        73: { desc: 'Moderate snow', icon: '❄️' },
        75: { desc: 'Heavy snow', icon: '❄️' },
        95: { desc: 'Thunderstorm', icon: '⛈️' },
        96: { desc: 'Thunderstorm with hail', icon: '⛈️' },
        99: { desc: 'Heavy thunderstorm', icon: '⛈️' }
    };
    return codes[code] || { desc: 'Unknown', icon: '🌡️' };
}

// Format date to abbreviated day (e.g., "Mon", "Tue")
function getDayName(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
}

// Fetch weather data from Open-Meteo API
async function fetchWeather(city) {
    try {
        // Reset UI states
        errorMessage.textContent = '';
        dashboardContent.classList.add('d-none');
        spinner.classList.remove('d-none');

        // 1. Get Coordinates from Geocoding API
        const isArabic = /[\u0600-\u06FF]/.test(city);
        const lang = isArabic ? 'ar' : 'en';
        const geoResponse = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=${lang}`);
        const geoData = await geoResponse.json();

        if (!geoData.results || geoData.results.length === 0) {
            throw new Error('City not found. Please try another name.');
        }

        const { latitude, longitude, name, country } = geoData.results[0];

        // 2. Get Weather Data using coordinates
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;

        const weatherResponse = await fetch(weatherUrl);
        if (!weatherResponse.ok) throw new Error('Failed to fetch weather data.');

        const weatherData = await weatherResponse.json();

        // Update UI
        updateCurrentWeather(name, country, weatherData.current);
        updateForecast(weatherData.daily);

        // Show Dashboard
        spinner.classList.add('d-none');
        dashboardContent.classList.remove('d-none');
    } catch (error) {
        spinner.classList.add('d-none');
        errorMessage.textContent = error.message;
    }
}

// Update the Main Card
function updateCurrentWeather(name, country, current) {
    const meta = getWeatherMeta(current.weather_code);

    cityNameEl.textContent = `${name}, ${country}`;
    tempEl.textContent = `${Math.round(current.temperature_2m)}°C`;
    weatherIconEl.textContent = meta.icon;
    weatherDescEl.textContent = meta.desc;
    humidityEl.textContent = `${current.relative_humidity_2m}%`;
    windSpeedEl.textContent = `${current.wind_speed_10m} km/h`;
}

// Update 5-Day Forecast Row
function updateForecast(daily) {
    forecastContainer.innerHTML = '';
    
    // The API returns up to 7 days. We skip today (index 0) and take the next 5 days.
    for (let i = 1; i <= 5; i++) {
        const meta = getWeatherMeta(daily.weather_code[i]);
        const dayName = getDayName(daily.time[i]);
        const maxTemp = Math.round(daily.temperature_2m_max[i]);
        const minTemp = Math.round(daily.temperature_2m_min[i]);

        // Creating forecast card dynamically. Note the BS5 flex grid 'col-lg' ensures equal sizing.
        const cardHTML = `
            <div class="col-6 col-md-4 col-lg mb-3">
                <div class="forecast-card glass-panel">
                    <div class="forecast-day">${dayName}</div>
                    <div class="forecast-emoji">${meta.icon}</div>
                    <div class="forecast-temp">
                        ${maxTemp}° <span class="min">${minTemp}°</span>
                    </div>
                </div>
            </div>
        `;
        forecastContainer.innerHTML += cardHTML;
    }
}

// Event Listeners
searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const city = cityInput.value.trim();
    if (city) {
        fetchWeather(city);
    }
});

// Initialize app with London by default on DOM Load
document.addEventListener('DOMContentLoaded', () => {
    fetchWeather('London');
});