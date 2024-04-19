const { addonBuilder } = require("stremio-addon-sdk");
const magnet = require("magnet-uri");
const RutrackerApi = require('rutracker-api-with-proxy');
const rutracker = new RutrackerApi();

const manifest = { 
    "id": "org.stremio.nba-addon",
    "version": "1.0.0",

    "name": "NBA Addon",
    "description": "NBA Addon",

    // set what type of resources we will return
    "resources": [
        "catalog",
        "stream",
        "meta"
    ],

    "types": ["movie"], // your add-on will be preferred for those content types

    // set catalogs, we'll be making 2 catalogs in this case, 1 for movies and 1 for series
    "catalogs": [
        {
            type: 'movie',
            id: 'nba-addon'
        }
    ],

    // prefix of item IDs (ie: "tt0032138")
    // "idPrefixes": [ "tt" ]

};

teams = {
    "hawks": "atl",
    "nets": "bkn",
    "celtics": "bos",
    "hornets": "cha",
    "bulls": "chi",
    "cavaliers": "cle",
    "mavericks": "dal",
    "nuggets": "den",
    "pistons": "det",
    "warriors": "gsw",
    "rockets": "hou",
    "pacers": "ind",
    "clippers": "lac",
    "lakers": "lal",
    "grizzlies": "mem",
    "heat": "mia",
    "bucks": "mil",
    "timberwolves": "min",
    "pelicans": "nop",
    "knicks": "nyk",
    "thunder": "okc",
    "magic": "orl",
    "76ers": "phi",
    "suns": "phx",
    "blazers": "por",
    "kings": "sac",
    "spurs": "sas",
    "raptors": "tor",
    "jazz": "uta",
    "wizards": "was"
}

let dataset;

// utility function to add from magnet
function fromMagnet(name, type, uri) {
    const parsed = magnet.decode(uri);
    const infoHash = parsed.infoHash.toLowerCase();
    const tags = [];
    if (uri.match(/720p/i)) tags.push("720p");
    if (uri.match(/1080p/i)) tags.push("1080p");
    return {
        name: name,
        type: type,
        infoHash: infoHash,
        sources: (parsed.announce || []).map(function(x) { return "tracker:"+x }).concat(["dht:"+infoHash]),
        tag: tags,
        title: tags[0], // show quality in the UI
    }
}

const builder = new addonBuilder(manifest);

// Streams handler
builder.defineStreamHandler(function(args) {
	console.log(args);
    if (true) {
    	return rutracker.login({ username: process.env.RUTRACKER_USER, password: process.env.RUTRACKER_PWD })
		  .then(() => rutracker.getMagnetLink(args.id))
		  .then(magnet => {
		  	let title_split = t.title.split(/\/|\[/);
            		let idx = title_split.findIndex(e => /\d+\.\d+\.\d+/.test(e));
		  	let t = dataset.filter(e => e.id == args.id)[0];
		  	let title = t.title.split(/\/|\[/).slice(idx, idx + 2).join();
		  	let seeds = t.seeds;
		  	let leeches = t.leeches;
		  	let size = (t.size / 1000000000).toFixed(2) + ' GB'

		  	return { streams: [fromMagnet(title + ' | ' + size + ' | S:' + seeds + ' / L:' + leeches, args.type, magnet)] };
		  });
        // return Promise.resolve({ streams: [fromMagnet(args.name, args.type, "magnet:?xt=urn:btih:8506E892D2D1C5443978FB31BCFC47CDCF37AD67&tr=http%3A%2F%2Fbt3.t-ru.org%2Fann%3Fmagnet&dn=NBA%202023-2024%20%2F%20RS%20%2F%2012.01.2024%20%2F%20Charlotte%20Hornets%20%40%20San%20Antonio%20Spurs%20%5B%D0%91%D0%B0%D1%81%D0%BA%D0%B5%D1%82%D0%B1%D0%BE%D0%BB%2C%20WEB-DL%20HD%2F720p%2F60fps%2C%20MKV%2FH.264%2C%20EN%20%2F%20BS-CHA%5D")] });
    } else {
        return Promise.resolve({ streams: [] });
    }
})

const LOGO_API_URL = "https://jakubkocvara-python.adaptable.app"
function reverseDate(x) {
	return x.split('.').reverse().join();
}

function compare( a, b ) {
	a_r = reverseDate(a.game_date);
	b_r = reverseDate(b.game_date);
	if ( a_r > b_r ){
	return -1;
	}
	if ( b_r < a_r ){
	return 1;
	}
	return 0;
}

builder.defineCatalogHandler(function(args, cb) {

    // return Promise.resolve({ metas: metas })
    return rutracker.login({ username: 'vonbahnhofk2', password: 'matrix123' })
	  .then(() => rutracker.search({ query: 'nba', sort: 'seeds' }))
	  .then(function(torrents) {
	  	dataset = torrents.filter(e => e.category.includes('NBA'));
	  	// console.log(dataset);
		return dataset;
	  }).then(function(torrents) {
	  	torrent_obj = {};
	  	torrents.forEach(function(torrent) {
	  		let title_split = torrent.title.split(/\/|\[/);
            		let idx = title_split.findIndex(e => /\d+\.\d+\.\d+/.test(e));
	  		let team_names = title_split[idx + 1].split('@').map((t) => {
	  			let str_arr = t.trim().toLowerCase().split(' ');
	  			let team_key = str_arr[str_arr.length - 1];
	  			return teams[team_key];
	  		});
	  		let game_date = title_split[idx].trim();
	  		let key = [team_names[0], team_names[1], game_date].join('_');
	  		if (!(torrent_obj[key] && torrent_obj[key].seeds > torrent.seeds)) {	  			
		  		torrent_obj[key] = {
		  			away_team: team_names[0],
		  			home_team: team_names[1],
		  			game_date: game_date,
		  			torrent_id: torrent.id,
		  			seeds: torrent.seeds
		  		};	
	  		}
	  	});

	  	torrent_obj = Object.values(torrent_obj).filter((obj => {
	  		return !Object.values(obj).some(e => e === undefined);
	  	}));

  		return Object.values(torrent_obj).sort(compare).map((obj) => {
  			return {
		  		id: obj.torrent_id,
		  		type: 'movie',
		  		name: obj.game_date + ' / ' + obj.away_team.toUpperCase() + ' @ ' + obj.home_team.toUpperCase(),
	        	poster: `${LOGO_API_URL}/vertical_logo/${obj.away_team}/${obj.home_team}?q=${obj.game_date} | S:${obj.seeds}`
	        }
  		});
	  }).then(function(torrents) {
	  	return {metas: torrents}
	  });
});

builder.defineMetaHandler(function(args) {
	let t = dataset.filter(e => e.id == args.id)[0];

    if (t) {        
  	let title_split = t.title.split(/\/|\[/);
        let idx = title_split.findIndex(e => /\d+\.\d+\.\d+/.test(e));
	let team_names = title_split[idx + 1].split('@').map((t) => {
		let str_arr = t.trim().toLowerCase().split(' ');
		let team_key = str_arr[str_arr.length - 1];
		return teams[team_key];
	});
        const metaObj = {
            id: args.id,
            name: title_split.slice(idx, idx + 2).join(),
            releaseInfo: '2024',
            poster: `${LOGO_API_URL}/vertical_logo/${team_names[0]}/${team_names[1]}`,
            background: `${LOGO_API_URL}/horizontal_logo/${team_names[0]}/${team_names[1]}`,
            type: 'movie'
        }
        return Promise.resolve({ meta: metaObj })
    } else {
        // otherwise return no meta
        return Promise.resolve({ meta: {} })
    }
})

module.exports = builder.getInterface()
