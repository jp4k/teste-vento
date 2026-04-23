// API Keys
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const WEATHERAPI_KEY = "YOUR_WEATHERAPI_KEY"; // Obtenha em https://www.weatherapi.com/

// Atualizar interface das condições de drone
function updateDroneUI(result) {
    const { status, label, color, reasons } = result;
    let icon, className;

    switch (status) {
        case 'good':
            icon = '🟢';
            className = 'drone-good';
            break;
        case 'caution':
            icon = '🟡';
            className = 'drone-caution';
            break;
        case 'danger':
            icon = '🔴';
            className = 'drone-danger';
            break;
        default:
            icon = '⏳';
            className = '';
    }

    droneIconEl.textContent = icon;
    droneTextEl.textContent = label;
    droneStatusEl.className = `drone-status ${className}`;
    droneReasonsEl.textContent = reasons.length > 0 ? reasons.join(' • ') : 'Condições favoráveis';
}

// Avaliar condições para voo de drone
function checkDroneConditions(weatherData, kpIndex = 2) {
    let status = "good"; // good, caution, danger
    let reasons = [];

    // Converter vento m/s → km/h
    const windSpeed = weatherData.wind.speed * 3.6;
    const gust = weatherData.wind.gust ? weatherData.wind.gust * 3.6 : 0;
    const humidity = weatherData.main.humidity;
    const temp = weatherData.main.temp;
    const visibility = weatherData.visibility || 10000;
    const weatherMain = weatherData.weather[0].main.toLowerCase();

    // 🌬️ VENTO
    if (windSpeed > 25) {
        status = "danger";
        reasons.push("Vento forte");
    } else if (windSpeed > 15 && status !== "danger") {
        status = "caution";
        reasons.push("Vento moderado");
    }

    // 💨 RAJADAS
    if (gust > 30) {
        status = "danger";
        reasons.push("Rajadas de vento fortes");
    }

    // 🌧️ CHUVA / TEMPESTADE
    if (weatherMain.includes("rain")) {
        status = "danger";
        reasons.push("Chuva detectada");
    }
    if (weatherMain.includes("storm") || weatherMain.includes("thunderstorm")) {
        status = "danger";
        reasons.push("Tempestade");
    }

    // 🌫️ VISIBILIDADE
    if (visibility < 1000) {
        status = "danger";
        reasons.push("Baixa visibilidade");
    } else if (visibility < 2000 && status !== "danger") {
        status = "caution";
        reasons.push("Visibilidade reduzida");
    }

    // 💧 UMIDADE
    if (humidity > 90 && status !== "danger") {
        status = "caution";
        reasons.push("Umidade alta");
    }

    // 🌡️ TEMPERATURA
    if ((temp < 0 || temp > 40) && status !== "danger") {
        status = "caution";
        reasons.push("Temperatura extrema");
    }

    // 🌌 ÍNDICE KP (geomagnético)
    if (kpIndex >= 6) {
        status = "danger";
        reasons.push("Alta atividade geomagnética (Kp alto)");
    } else if (kpIndex >= 4 && status !== "danger") {
        status = "caution";
        reasons.push("Atividade geomagnética moderada");
    }

    // 🎯 Resultado final
    let label = "";
    let color = "";

    if (status === "good") {
        label = "🟢 Bom para voar";
        color = "green";
    } else if (status === "caution") {
        label = "🟡 Voe com cautela";
        color = "yellow";
    } else {
        label = "🔴 Não recomendável voar";
        color = "red";
    }

    return {
        status,
        label,
        color,
        reasons
    };
}

// Função para atualizar todos os dados do clima
async function updateWeatherData() {
    statusEl.textContent = 'Atualizando dados...';

    try {
        // Buscar dados do clima
        await fetchForecast();

        await fetchCurrentWeather();

        statusEl.textContent = 'Atualizado agora';

    } catch (error) {
        console.error('Erro na atualização geral:', error);
        statusEl.textContent = 'Erro ao atualizar, tentando novamente...';
    }
}

// Elementos DOM
const cityEl = document.getElementById('city');
const dateTimeEl = document.getElementById('date-time');
const statusEl = document.getElementById('status');
const weatherIconEl = document.getElementById('weather-icon');
const temperatureEl = document.getElementById('temperature');
const feelsLikeEl = document.getElementById('feels-like');
const tempMaxEl = document.getElementById('temp-max');
const tempMinEl = document.getElementById('temp-min');
const humidityEl = document.getElementById('humidity');
const precipitationEl = document.getElementById('precipitation');
const windEl = document.getElementById('wind');
const weeklyForecastEl = document.getElementById('weekly-forecast');
const cityInput = document.getElementById('city-input');
const searchBtn = document.getElementById('search-btn');
const locationBtn = document.getElementById('location-btn');

// Atualizar data e hora
function updateDateTime() {
    const now = new Date();
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    dateTimeEl.textContent = now.toLocaleDateString('pt-BR', options);
}

// Ícones do clima
const weatherIcons = {
    'Clear': '☀️',
    'Clouds': '☁️',
    'Rain': '🌧️',
    'Drizzle': '🌦️',
    'Thunderstorm': '⛈️',
    'Snow': '❄️',
    'Mist': '🌫️',
    'Fog': '🌫️',
    'Haze': '🌫️'
};

// Buscar dados atuais de múltiplas APIs
async function fetchCurrentWeather() {
    statusEl.textContent = 'Atualizando dados...';
    const promises = [];

    // OpenWeatherMap
    if (currentLat && currentLon) {
        promises.push(fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${currentLat}&lon=${currentLon}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=pt`));
    } else {
        promises.push(fetch(`https://api.openweathermap.org/data/2.5/weather?q=${currentCity}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=pt`));
    }

    // WeatherAPI
    if (WEATHERAPI_KEY !== 'YOUR_WEATHERAPI_KEY') {
        if (currentLat && currentLon) {
            promises.push(fetch(`https://api.weatherapi.com/v1/current.json?key=${WEATHERAPI_KEY}&q=${currentLat},${currentLon}&lang=pt`));
        } else {
            promises.push(fetch(`https://api.weatherapi.com/v1/current.json?key=${WEATHERAPI_KEY}&q=${currentCity}&lang=pt`));
        }
    }

    try {
        const responses = await Promise.allSettled(promises);
        const data = responses.map(res => res.status === 'fulfilled' ? res.value : null).filter(Boolean);

        if (data.length === 0) throw new Error('Nenhuma API disponível');

        const weatherData = await Promise.all(data.map(res => res.json()));

        // Combinar dados
        const combined = combineWeatherData(weatherData);
        displayCurrentWeather(combined);

        statusEl.textContent = 'Atualizado agora';

    } catch (error) {
        console.error('Erro ao buscar clima atual:', error);
        statusEl.textContent = 'Erro ao atualizar, tentando novamente...';
        // Não carregar mock para manter dados antigos
    }
}

// Combinar dados de múltiplas APIs
function combineWeatherData(data) {
    const temps = data.map(d => d.main ? d.main.temp : d.current ? d.current.temp_c : null).filter(Boolean);
    const feels = data.map(d => d.main ? d.main.feels_like : d.current ? d.current.feelslike_c : null).filter(Boolean);
    const hums = data.map(d => d.main ? d.main.humidity : d.current ? d.current.humidity : null).filter(Boolean);
    const winds = data.map(d => d.wind ? d.wind.speed * 3.6 : d.current ? d.current.wind_kph : null).filter(Boolean);
    const precips = data.map(d => d.rain ? d.rain['1h'] || 0 : d.current ? d.current.precip_mm : 0).filter(Boolean);

    const avgTemp = temps.length ? Math.round(temps.reduce((a, b) => a + b) / temps.length) : 21;
    const avgFeels = feels.length ? Math.round(feels.reduce((a, b) => a + b) / feels.length) : avgTemp;
    const avgHum = hums.length ? Math.round(hums.reduce((a, b) => a + b) / hums.length) : 65;
    const avgWind = winds.length ? Math.round(winds.reduce((a, b) => a + b) / winds.length) : 15;
    const avgPrecip = precips.length ? Math.round(precips.reduce((a, b) => a + b) / precips.length) : 0;

    // Usar dados do primeiro para outros campos
    const first = data[0];
    const city = first.name || first.location?.name || 'Cidade Desconhecida';
    const country = first.sys?.country || first.location?.country || '';
    const weather = first.weather ? first.weather[0] : first.current?.condition;
    const tempMax = first.main ? first.main.temp_max : first.forecast?.forecastday[0]?.day?.maxtemp_c || avgTemp + 4;
    const tempMin = first.main ? first.main.temp_min : first.forecast?.forecastday[0]?.day?.mintemp_c || avgTemp - 4;

    return {
        city: `${city}, ${country}`,
        temp: avgTemp,
        feels: avgFeels,
        tempMax: Math.round(tempMax),
        tempMin: Math.round(tempMin),
        humidity: avgHum,
        precipitation: avgPrecip,
        wind: avgWind,
        weather: weather
    };
}

// Exibir dados atuais
function displayCurrentWeather(data) {
    cityEl.textContent = data.city;
    temperatureEl.textContent = `${data.temp}°C`;
    feelsLikeEl.textContent = `${data.feels}°C`;
    tempMaxEl.textContent = `${data.tempMax}°C`;
    tempMinEl.textContent = `${data.tempMin}°C`;
    humidityEl.textContent = `${data.humidity}%`;
    precipitationEl.textContent = `${data.precipitation} mm`;
    windEl.textContent = `${data.wind} km/h`;

    const icon = weatherIcons[data.weather.main || data.weather.text] || '☀️';
    weatherIconEl.textContent = icon;
}

// Buscar previsão (usando OpenWeatherMap)
async function fetchForecast() {
    try {
        let url = `https://api.openweathermap.org/data/2.5/forecast?q=${currentCity}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=pt`;
        if (currentLat && currentLon) {
            url = `https://api.openweathermap.org/data/2.5/forecast?lat=${currentLat}&lon=${currentLon}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=pt`;
        }
        const response = await fetch(url);
        const data = await response.json();

        renderHourlyChart(data.list.slice(0, 8));
        renderWeeklyForecast(data.list);
    } catch (error) {
        console.error('Erro ao buscar previsão:', error);
        loadMockForecast();
    }
}

// Renderizar gráfico horário
function renderHourlyChart(data) {
    const ctx = document.getElementById('hourly-chart').getContext('2d');
    const labels = data.map(item => {
        const date = new Date(item.dt * 1000);
        return date.getHours() + 'h';
    });
    const temps = data.map(item => Math.round(item.main.temp));

    if (hourlyChart) {
        // Atualizar dados do gráfico existente
        hourlyChart.data.labels = labels;
        hourlyChart.data.datasets[0].data = temps;
        hourlyChart.update();
    } else {
        // Criar novo gráfico
        hourlyChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Temperatura (°C)',
                    data: temps,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        grid: {
                            color: '#333'
                        },
                        ticks: {
                            color: '#fff'
                        }
                    },
                    x: {
                        grid: {
                            color: '#333'
                        },
                        ticks: {
                            color: '#fff'
                        }
                    }
                }
            }
        });
    }
}

// Renderizar previsão semanal
function renderWeeklyForecast(data) {
    const dailyData = {};

    data.forEach(item => {
        const date = new Date(item.dt * 1000);
        const day = date.toLocaleDateString('pt-BR', { weekday: 'short' });

        if (!dailyData[day]) {
            dailyData[day] = {
                temps: [],
                icon: item.weather[0].main
            };
        }
        dailyData[day].temps.push(item.main.temp);
    });

    weeklyForecastEl.innerHTML = '';
    Object.keys(dailyData).slice(0, 7).forEach(day => {
        const { temps, icon } = dailyData[day];
        const max = Math.max(...temps);
        const min = Math.min(...temps);

        const dayEl = document.createElement('div');
        dayEl.className = 'day';
        dayEl.innerHTML = `
            <div>${day}</div>
            <div class="icon">${weatherIcons[icon] || '☀️'}</div>
            <div class="temp">
                <span>${Math.round(max)}°</span>
                <span>${Math.round(min)}°</span>
            </div>
        `;
        weeklyForecastEl.appendChild(dayEl);
    });
}

// Dados mock
function loadMockData() {
    cityEl.textContent = 'São Gabriel, Brasil';
    temperatureEl.textContent = '21°C';
    feelsLikeEl.textContent = '23°C';
    tempMaxEl.textContent = '25°C';
    tempMinEl.textContent = '18°C';
    humidityEl.textContent = '65%';
    precipitationEl.textContent = '0 mm';
    windEl.textContent = '15 km/h';
    weatherIconEl.textContent = '☀️';
}

function loadMockForecast() {
    const ctx = document.getElementById('hourly-chart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['12h', '15h', '18h', '21h', '00h', '03h', '06h', '09h'],
            datasets: [{
                label: 'Temperatura (°C)',
                data: [20, 22, 24, 21, 19, 18, 20, 23],
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    grid: {
                        color: '#333'
                    },
                    ticks: {
                        color: '#fff'
                    }
                },
                x: {
                    grid: {
                        color: '#333'
                    },
                    ticks: {
                        color: '#fff'
                    }
                }
            }
        }
    });

    const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    weeklyForecastEl.innerHTML = '';
    days.forEach((day, index) => {
        const dayEl = document.createElement('div');
        dayEl.className = 'day';
        dayEl.innerHTML = `
            <div>${day}</div>
            <div class="icon">☀️</div>
            <div class="temp">
                <span>${25 + index}°</span>
                <span>${18 + index}°</span>
            </div>
        `;
        weeklyForecastEl.appendChild(dayEl);
    });
}

// Buscar por cidade
searchBtn.addEventListener('click', () => {
    const city = cityInput.value.trim();
    if (city) {
        currentCity = city;
        currentLat = null;
        currentLon = null;
        updateWeatherData();
    }
});

cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        searchBtn.click();
    }
});

// Usar geolocalização
locationBtn.addEventListener('click', () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
            currentLat = position.coords.latitude;
            currentLon = position.coords.longitude;
            updateWeatherData();
        }, (error) => {
            console.error('Erro de geolocalização:', error);
            alert('Não foi possível obter sua localização.');
        });
    } else {
        alert('Geolocalização não suportada pelo navegador.');
    }
});

// Inicializar
updateDateTime();
setInterval(updateDateTime, 60000); // Atualizar data/hora a cada minuto

// Só inicializar clima se a aba estiver ativa
if (document.getElementById('weather-tab').classList.contains('active')) {
    updateWeatherData();
}

// Atualizar dados automaticamente a cada 5 minutos (300000 ms) apenas se aba ativa
setInterval(() => {
    if (document.getElementById('weather-tab').classList.contains('active')) {
        updateWeatherData();
    }
}, 300000);
