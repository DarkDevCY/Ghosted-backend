const express = require("express");
const crypto = require('crypto');
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const bodyParser = require("body-parser");
const async = require("async");
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

app.post("/api/tvShows", (req, res) => {
	const tvShowsFetch = async() => {
		const tvShowsResponse = await axios.get('https://api.themoviedb.org/3/tv/popular?api_key='+process.env.API_KEY_MOVIES+'&language=en-US');
		return res.json(tvShowsResponse.data);
	}
	tvShowsFetch()
})

app.post("/api/airingTV", (req, res) => {
	const airingTV = async() => {
		const airingTVResponse = await axios.get('https://api.themoviedb.org/3/tv/airing_today?api_key='+process.env.API_KEY_MOVIES);
		return res.json(airingTVResponse.data);
	}
	airingTV()
})

app.post("/api/newMovies", (req, res) => {
	const newMoviesFetch = async() => {
		const newMoviesResponse = await axios.get('https://api.themoviedb.org/3/movie/now_playing?api_key='+process.env.API_KEY_MOVIES);
		return res.json(newMoviesResponse.data);
	}
	newMoviesFetch()
})

app.post("/api/popMovies", (req, res) => {
	const popMovies = async() => {
		const popMoviesResponse = await axios.get('https://api.themoviedb.org/3/trending/movie/day?api_key='+process.env.API_KEY_MOVIES);
		return res.json(popMoviesResponse.data);
	};
	popMovies()
})

app.post("/api/searchMovies", (req, res) => {
	const searchMovies = async() => {
		const searchMoviesResponse = await axios.get('https://api.themoviedb.org/3/search/movie?api_key='+process.env.API_KEY_MOVIES+'&query='+req.body.searchData);
		return res.json(searchMoviesResponse.data);
	};
	searchMovies()
})

app.post("/api/searchTV", (req, res) => {
	const searchTV = async() => {
		const searchTVResponse = await axios.get('https://api.themoviedb.org/3/search/tv?api_key='+process.env.API_KEY_MOVIES+'&query='+req.body.searchData);
		return res.json(searchTVResponse.data, req.body.searchData);
	};
	searchTV()
})

app.post("/api/upcoming", (req, res) => {
	const upcoming = async() => {
		const upcomingResponse = await axios.get('https://api.themoviedb.org/3/movie/upcoming?api_key='+process.env.API_KEY_MOVIES);
		return res.json(upcomingResponse.data);
	};
	upcoming()
})

app.post("/api/genres", (req,res) => {
	const genres = async() => {
		const genresResponse = await axios.get('https://api.themoviedb.org/3/genre/movie/list?api_key='+process.env.API_KEY_MOVIES);
		return res.json(genresResponse.data);
	};
	genres()
})

app.post("/api/movieID", (req,res) => {
	const movieID = async() => {
		const movieIDResponse = await axios.get('https://api.themoviedb.org/3/movie/'+req.body.mid+'?api_key='+process.env.API_KEY_MOVIES+'&language=en-US');
		const movieVideos = await axios.get('https://api.themoviedb.org/3/movie/'+req.body.mid+'/videos?api_key='+process.env.API_KEY_MOVIES+'&language=en-US');
		const castResponse = await axios.get('https://api.themoviedb.org/3/movie/'+req.body.mid+'/credits?api_key='+process.env.API_KEY_MOVIES);	
		
		return res.json([movieIDResponse.data, movieVideos.data, castResponse.data]);
	};
	movieID()
})

app.post("/api/tvID", (req,res) => {
	const tvID = async() => {
		const tvIDResponse = await axios.get('https://api.themoviedb.org/3/tv/'+req.body.mid+'?api_key='+process.env.API_KEY_MOVIES+'&language=en-US');
		const tvIDVideos = await axios.get('https://api.themoviedb.org/3/tv/'+req.body.mid+'/videos?api_key='+process.env.API_KEY_MOVIES+'&language=en-US');
		
		return res.json([tvIDResponse.data, tvIDVideos.data])
	};
	tvID()
})

app.listen(2005)
