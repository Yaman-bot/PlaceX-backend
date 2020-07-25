const fs=require('fs')
const { validationResult } = require('express-validator')
const mongoose = require('mongoose')

const HttpError = require('../models/http-error')
const Place = require('../models/place')
const User = require('../models/user');

const geocoding=require('../util/location')


const getPlaceById = async (req, res, next) => {
    const placeId = req.params.pid; // { pid: 'p1' }

    let place;
    try {
        //FindById is a static method therefore used on PLace(constructor function) and not on any instance
        //*********** 
        //NOTE-> FindByID doesn't return a actual promise,we can use async await due to feature of mongoose.
        //*********** 
        place = await Place.findById(placeId);
    } catch (err) {
        //Error with get request
        const error = new HttpError('Something went wrong, could not find a place.', 500);
        return next(error);
    }

    //Error if place not found in DB
    if (!place) {
        return next(
            new HttpError('Could not find a place for the provided user id.', 404)
        );
    }

    //For getting rid of id property and converting to a normal JS object and not a mongoose object
    res.json({ place: place.toObject({ getters: true }) });
}


const getPlacesByUserId = async (req, res, next) => {
    const userId = req.params.uid;

    let places;
    try {
        places = await Place.find({ creator: userId });
    } catch (err) {
        const error = new HttpError('Fetching places failed, please try again later', 500);
        return next(error);
    }


    if (!places || places.length === 0) {
        return next(
            new HttpError('Could not find a place for the provided user id.', 404)
        );
    }

    res.json({ places: places.map(place => place.toObject({ getters: true })) });
}


const createPlace = async (req, res, next) => {
    const errors = validationResult(req)

    if (!errors.isEmpty()) {
       return  next(new HttpError('Invalid inputs passed, please check your data', 422))
    }

    const { title, description, address, creator } = req.body

    let coordinates
    try{
        coordinates = await geocoding(address)
    }catch(err){
        return next(err)
    }
    

    const createdPlace = new Place({
        title,
        description,
        address,
        location:coordinates,
        image:req.file.path,
        creator
    })

    //Checking if UserID exists,then only a place could be created
    let user;
    try {
        user = await User.findById(creator)
    } catch (err) {
        const error = new HttpError("Creating place failed,please try again", 500)
        return next(error)
    }

    if (!user) {
        const error = new HttpError("Could not find the user for given id", 404)
        return next(error)
    }

    //We need to be able to kind of execute different or multiple operations which are not directly related to each other.
    //And if one of these operations fails independently from each other then we want to make sure to undo all operations.
    //Transactions allows us to perform multiple operations in isolation of each other andthe transactions are basically built on so-called sessions.
    //So to work with these transactions we first have to start a session.Then we can initiate the transaction and once the transaction is successful
    //the session is finished and these transactions are committed.

    try {
        const session = await mongoose.startSession()
        session.startTransaction()
        await createdPlace.save({ session: session })

        //Push is not the standard push but that we can use on any javascript array,instead this is a method used by Mongoose which kind of allows
        //Mongoose to behind the scene establish the connection between the two models we are referring to here.
        //Behind the scenes MongoDb grabs the createdPlace id which is a integrated Mongoose feature here and adds it to the place field off the user
        user.places.push(createdPlace)
        await user.save({ session: session })
        await session.commitTransaction()

        //save is not a static method therefore used on instance of PLace(constructor function)
        //await createdPlace.save()
    } catch (err) {
        const error = new HttpError("Creating place failed,please try again", 500)
        return next(error)
    }


    res.status(201).json({ place: createdPlace })
}


const updatePlace = async (req, res, next) => {
    const errors = validationResult(req)

    if (!errors.isEmpty()) {
        throw new HttpError('Invalid inputs passed, please check your data', 422)
    }

    const { title, description } = req.body;
    const placeId = req.params.pid;

    let place;
    try {
        place = await Place.findById(placeId);
    } catch (err) {
        const error = new HttpError('Something went wrong, could not update place.', 500);
        return next(error);
    }

    //Authorization Check
    if(place.creator.toString() !==req.userData.userId){
        const error = new HttpError('You are not allowed to edit this place.', 401);  //401 is authorization error
        return next(error);
    }

    place.title = title;
    place.description = description;

    try {
        await place.save();
    } catch (err) {
        const error = new HttpError('Something went wrong, could not update place.', 500);
        return next(error);
    }

    res.status(200).json({ place: place.toObject({ getters: true }) });
};


const deletePlace = async (req, res, next) => {
    const placeId = req.params.pid;

    let place;
    try {
        //Populate allows us to refer to a document stored in another collection and to work with data in that existing document of that other collection
        //With the creator property which contains the id Mongoose can simply access the enter content of this document stored in the other collection.
        place = await Place.findById(placeId).populate('creator')
    } catch (err) {
        const error = new HttpError('Something went wrong, could not delete place.', 500);
        return next(error);
    }

    if (!place) {
        const error = new HttpError('Could not find place for this id.', 404);
        return next(error)
    }

    //Authorization Check
    //Here creator is full User object due to populate method.
    if(place.creator.id !==req.userData.userId){
        const error = new HttpError('You are not allowed to delete this place.', 401);  //401 is authorization error
        return next(error);
    }

    const imagePath=place.image

    try {
        const session = await mongoose.startSession()
        session.startTransaction()
        await place.remove({ session: session });
        place.creator.places.pull(place)
        await place.creator.save({ session: session })
        await session.commitTransaction()

    } catch (err) {
        const error = new HttpError('Something went wrong, could not delete place.', 500);
        return next(error);
    }

    fs.unlink(imagePath,err=>{
        console.log(err)
    })

    res.status(200).json({ message: 'Deleted place.' });
};


module.exports = { getPlaceById, getPlacesByUserId, createPlace, updatePlace, deletePlace }