'use strict';


const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');



class Workout {

    date = new Date();
    id = (Date.now() + '').slice(-10);
    clicks = 0;
    constructor(coords, distance, duration) {
        this.coords = coords;
        this.distance = distance;
        this.duration = duration;
    }

    _setDescription(){
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
    }

    _click(){
        this.clicks++;
    }
}


///////////////////////////////
///RUNNING CLASS
class Running extends Workout {
    type = 'running';
    constructor(coords, distance, duration, cadence) {
        super(coords, distance, duration);
        this.cadence = cadence;
        this.calcPace();
        this._setDescription();
    }

    calcPace() {
        this.pace = this.duration / this.distance;
        return this.pace
    }
}

///////////////////////////////////
////CYCLING CLASS

class Cycling extends Workout {
    type = 'cycling';
    constructor(coords, distance, duration, elevationGain) {
        super(coords, distance, duration);
        this.elevationGain = elevationGain;
        this.calcSpeed();
        this._setDescription();
    }

    calcSpeed() {
        this.speed = this.distance / (this.duration / 60);
        return this.speed;
    }
}


////////////////////////////////////
/////APPLICATION ARCHITECTURE
class App {
    #map;
    #mapEvent;
    #workouts = [];
    #mapZoom = 14;

    constructor() {

        //set local storage
        this._getLocalStorage();

        //get position
        this._getPosition();

        //event handlers
        inputType.addEventListener('change', this._toggleElevationField.bind(this));
        form.addEventListener('submit', this._newWorkout.bind(this));
        containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    }

    _getPosition() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function () {
                alert('unsuccessful')
            })
        }
    }


    _loadMap(position) {
        const {
            longitude,
            latitude
        } = position.coords;

        const coords = [latitude, longitude];

        this.#map = L.map('map').setView(coords, this.#mapZoom);

        L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);


        this.#map.on('click', this._showForm.bind(this));

        this.#workouts.forEach(work => { 
            this._renderWorkoutOnMap(work);
        })
    }

    _showForm(mapE) {
        this.#mapEvent = mapE;
        form.classList.remove('hidden');
    }

    _toggleElevationField() {
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    }

    _newWorkout(e) {
        e.preventDefault();

        const isValid = (...values) => values.every(val => Number.isFinite(val));
        const isPositive = (...values) => values.every(val => val > 0 );
        let workout;
        const {
            lat,
            lng
        } = this.#mapEvent.latlng

        //get data from form
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;
        const type = inputType.value;


        //if workout is running, create running object
        if (type === 'running') {
            const cadence = +inputCadence.value;
            // check if data is valid
            if (
                !isValid(distance, duration, cadence) ||
                !isPositive(distance, duration, cadence)
             )return alert('values are not valid');

            workout = new Running([lat, lng], distance,duration, cadence); 
        }

        //if workout is cycling, create running object
        if (type === 'cycling') {
            const elevation = +inputElevation.value;

            // check if data is valid
            if (
                !isValid(distance, duration, elevation) ||
                !isPositive(distance, duration)
             )return alert('values are not valid');
            
            workout = new Cycling([lat, lng], distance,duration, elevation); 
        }

        this.#workouts.push(workout);

        ///////////////////////
        ///render workout on map as marker
        this._renderWorkoutOnMap(workout);
        

        
        //////////////////////////////
        ////RENDERING WORKOUT ON LIST    
        this._renderWorkoutOnList(workout)

        //////////////////////////////
        //CLEAR INPUTS + hiding form
        this._hideForm();

        ///////////////////////////////
        ////STORING DATA IN LOCAL STORAGE
        this._setLocalStorage();

    }


    //////////////////////////////
    ////RENDERING WORKOUT ON MAP
    _renderWorkoutOnMap(workout){
        L.marker(workout.coords).addTo(this.#map)
            .bindPopup(L.popup({
                maxWidth: 250,
                minWidth: 50,
                autoClose: false,
                closeOnClick: false,
                className: `${workout.type}-popup`
            }))
            .setPopupContent(`${workout.description}`)
            .openPopup();
    }
    

    _hideForm(){
        inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = '';
        form.style.display = 'none'; 
        form.classList.add('hidden');

        setTimeout(() =>  form.style.display = 'grid', 1000);
    }


    _renderWorkoutOnList(workout){
        let html =`
        <li class="workout workout--${workout.type}" data-id=${workout.id}>
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
          <span class="workout__icon">
          ${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}
          </span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>
        `

        if(workout.type === 'running'){
        html += `
        <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.pace.toFixed(1)}</span>
        <span class="workout__unit">min/km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">🦶🏼</span>
        <span class="workout__value">${workout.cadence}</span>
        <span class="workout__unit">spm</span>
      </div>
        `}

       if(workout.type === 'cycling'){
       html += `
       <div class="workout__details">
       <span class="workout__icon">⚡️</span>
       <span class="workout__value">${workout.speed.toFixed(1)}</span>
       <span class="workout__unit">km/h</span>
     </div>
     <div class="workout__details">
       <span class="workout__icon">⛰</span>
       <span class="workout__value">${workout.elevationGain}</span>
       <span class="workout__unit">m</span>
     </div>
       `}

    form.insertAdjacentHTML('afterend', html);
    }
    
    _moveToPopup(e){
        const workoutEl = e.target.closest('.workout');

        if(!workoutEl) return;

        const workout = this.#workouts.find(work => work.id === workoutEl.dataset.id);

        this.#map.setView(workout.coords, this.#mapZoom, {
        animate: true,
        pan: {
            duration: 1
        }
        })

        //using public interfere
        // workout._click()
    }

    _setLocalStorage(){
        localStorage.setItem('workouts', JSON.stringify(this.#workouts));
    }

    _getLocalStorage(){
        const data = JSON.parse(localStorage.getItem('workouts'));

        if(!data) return;
        this.#workouts = data;

        this.#workouts.forEach(work => { 
            this._renderWorkoutOnList(work);
        } )

    }

    _reset(){
        localStorage.removeItem('workouts');
        location.reload();
    }

}

const app = new App();