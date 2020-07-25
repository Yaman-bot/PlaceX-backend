const Geocodio = require('geocodio-library-node');
const HttpError = require('../models/http-error');

const geocoder = new Geocodio(process.env.GEOCODE_API_KEY);

const geocoding=async (address)=>{
    const response=await geocoder.geocode(address)
    
    if(response.results.length===0){
        const error=new HttpError('Could not find location for specified address',422)
        throw error
    }

    const coordinates=response.results[0].location
    return coordinates
}

module.exports=geocoding