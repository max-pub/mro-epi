import { TALI } from "../lib/deps.js"
import { showCorrelationChart, showLocationChart, showTypeChart } from "./chart.js"
import { $, $$, download, getCorrelationSettings, getCorrelationString, getFilterSettings, show } from "./dom.js"
import { DATA, TEMPLATE, WORKER, cleanNumbers, showCorrelationResults, showCorrelationTables, startFilter } from "./main.js"
let TIMER = {}



export const input = new class {
	count = 0
	start() {
		if (++this.count == 2) return
		$('#source>ul').innerHTML = ``
		$('#source>table').innerHTML = `<tr class='typings'></tr> <tr class='locations'></tr>`
	}
	name(key, name) {
		// console.log('add', key, name)
		$(`#source>ul`).innerHTML += `<li class="${key} loading">loading ${name}... </li>`
	}
	keys(count) {
		if (count == 2)
			$$('#source form').map(form => form.reset())
	}
	size(key, name, size) {
		$(`#source>ul .${key}.loading`).innerHTML += `${(size / 1024 / 1024).toFixed(1)} MB`
		$(`#source>ul`).innerHTML += `<li class="${key} parsing">parsing ${name}... </li>`
	}
	time(key, name, time) {
		$(`#source>ul .${key}.parsing`).innerHTML += `${(time / 1000).toFixed(1)} seconds`
	}
	stat(key, name, data) {
		$(`#source>table .${key}`).innerHTML = TEMPLATE.stat_list(key, data)
		$(`#source>table .${key} a`).addEventListener('click', () => download(`${key}.tsv`, TALI.grid.stringify({ [key]: DATA.parsed[key] }, { sortRows: true })))
		// console.log('download', key, $(`#source .stats .${key} a`))
	}
	data(key, name, data) {
		DATA.parsed[key] = data
		if (Object.keys(DATA.parsed).length == 2) {
			startFilter()
			this.count = 0
			// for (let key of ['typings', 'locations'])
			// $(`#source .stats .${key} a`).addEventListener('click', () => download(`${key}.tsv`, TALI.grid.stringify({ [key]: DATA.parsed[key] }, { sortRows: true })))

			// setTimeout(()=>$('#source .parse').innerHTML='',1000)
		}
		// WORKER.filter.postMessage([DATA.parsed, getFilterSettings()])
	}
}







export const filter = new class {
	start() {
		$('#filter>ul').innerHTML = ``
		$('#filter>table').innerHTML = `<tr class='typings'></tr> <tr class='locations'></tr>`
	}
	from(data) {
		$(`#filter>ul`).innerHTML += `<li>removed ${data[0]} typings and ${data[1]} locations < ${getFilterSettings().from}</li>`
	}
	till(data) {
		$(`#filter>ul`).innerHTML += `<li>removed ${data[0]} typings and ${data[1]} locations > ${getFilterSettings().till}</li>`
	}
	rows(data) {
		let rowCount = Object.values(DATA.parsed.typings).length
		DATA.filterStats.rows = data.stats
		$(`#filter>ul`).innerHTML += `<li class='rows'>removed ${data.dropped}/${rowCount} typings that had less than ${data.cutoffPercentage}% or ${data.cutoffValue}/${data.maxEntries} values <a class='download'>tsv</a></li>`
		$('#filter .rows a').addEventListener('click', () => download(`typing.rows.tsv`, TALI.grid.stringify({ '': DATA.filterStats.rows }, { sortCol: 'count', pretty: 4 })))
	}
	cols(data) {
		let columnCount = Object.values(Object.values(DATA.parsed.typings)[0]).length
		DATA.filterStats.cols = data.stats
		$(`#filter>ul`).innerHTML += `<li class='cols'>removed ${data.dropped}/${columnCount} type-columns that had less than ${data.cutoffPercentage}% or ${data.cutoffValue}/${data.maxEntries} values <a class='download'>tsv</a></li>`
		$('#filter .cols a').addEventListener('click', () => download(`typing.cols.tsv`, TALI.grid.stringify({ '': DATA.filterStats.cols }, { sortCol: 'count', pretty: 4 })))
		// console.log('filter COLS', $('#filter .cols a'))
	}
	hasRoom(data) {
		$(`#filter>ul`).innerHTML += `<li>removed ${data} locations from patients without room-entries</li>`
	}
	matchingPatients(data) {
		$(`#filter>ul`).innerHTML += `<li>removed ${data.typings} typings and ${data.locations} locations that didnt have corresponding patient-ids</li>`
	}
	stat(data) {
		// console.log('-------stat', data)
		// for (let key in data)
		// 	console.log("KEYYY", key,)
		for (let key in data)
			$(`#filter>table .${key}`).innerHTML = TEMPLATE.stat_list(key, data[key]) //+ 		`<hr/>` + TEMPLATE.listStats(getAllPatientAndEntryCounts(DATA.parsed))
		for (let key in data)
			$(`#filter>table .${key} a`).addEventListener('click', () => download(`${key}.tsv`, TALI.grid.stringify({ [key]: DATA.filtered[key] }, { sortRows: true })))

	}
	result(data) {
		DATA.filtered = data
		if (getFilterSettings().pseudonymize) {// optionally anonymize all data
			// $('#filter #pseudonymize .help').innerHTML = `<progress value="0" max="100"> </progress>`
			$('#filter>ul').innerHTML += `<li class='pseudo'> <progress value="0" max="100"> </progress> </li>`
			TIMER.pseudo = Date.now()
			WORKER.pseudonymize.postMessage(DATA.filtered)
		} else startCrossMatch()

	}
	done() { }
}







export const pseudonymize = new class {
	start() { }

	progress(data) {
		let [current, total] = data
		$(`#filter .pseudo progress`).value = current
		$(`#filter .pseudo progress`).max = total
	}
	result(data) {
		DATA.filtered = data[0]
		DATA.PSEUDO = data[1]
		$('#filter .pseudo').innerHTML = `pseudonymized all ids in ${((Date.now() - TIMER.pseudo) / 1000).toFixed(1)} seconds    <a class='download'> tsv </a>`
		$('#filter .pseudo .download').addEventListener('click', () => download(`pseudonym.mapping.tsv`, TALI.grid.stringify(DATA.PSEUDO, { sortCol: 'count', pretty: 4 })))
		startCrossMatch()
	}
}




export function startCrossMatch() {
	// console.log('startCrossMatch')
	// $('#filter-stats .rows .download').addEventListener('click', () => download(`typing.rows.tsv`, TALI.grid.stringify({ '': DATA.filterStats.rows }, { sortCol: 'count', pretty: 4 })))
	// $('#filter-stats .cols .download').addEventListener('click', () => download(`typing.cols.tsv`, TALI.grid.stringify({ '': DATA.filterStats.cols }, { sortCol: 'count', pretty: 4 })))

	// $('#location-chart').innerHTML = TEMPLATE.chart_locations()
	// $$('#location-chart a.chart').map(node => node.addEventListener('click', event => showLocationChart(event.target.textContent.trim())))
	// console.log('links', $$('#location-chart a.chart'))
	showLocationChart()
	$$('#distance>*').map(node => node.innerHTML = '')
	// $('#distance').innerHTML = '<table class="info typings"></table> <table class="info locations"></table>'
	// for (let type of ['typings', 'locations'])
	// $('#distance .info').innerHTML += `<tr id="${type}"> <td> ${type} </td> <td> <progress value="0" max="100"> </progress> </td> </tr>`
	for (let type of ['typings', 'locations']){
		$('#distance ul').innerHTML += `<li id="${type}"> ${type}  <progress value="0" max="100"> </progress> </li>`
		$(`#distance table.${type}`).innerHTML+= `<caption>${type}</caption>`
	}
	DATA.distanceMatrix = {}
	// console.log('start matrix workers')
	WORKER.matrix_typings.postMessage(DATA.filtered.typings)
	WORKER.matrix_locations.postMessage(DATA.filtered.locations)
	// console.log('done matrix workers')
}




class Matrix {
	// constructor(name) {
	// 	this.name = name
	// }
	// start() {

	// }
	progress(current, total) {
		// let [current, total] = data
		$(`#distance li#${this.name} progress`).value = current
		$(`#distance li#${this.name} progress`).max = total
	}
	result(data) {
		DATA.distanceMatrix[this.name] = data
		console.log('matrix', this.name, data)
	}
	// stats(data) {
	// 	// console.log('distance stats', this.name, data)
	// 	$(`#distance #${this.name}`).innerHTML = TEMPLATE.stat_dist(this.name, data)
	// 	if (this.name == 'typings')
	// 		$(`#distance #${this.name} a`).addEventListener('click', () => download(`${this.name}.matrix.tsv`, TALI.grid.stringify({ [this.name]: DATA.distanceMatrix[this.name] }, { sortRows: true, sortCols: true })))
	// 	else
	// 		$(`#distance #${this.name} a`).addEventListener('click', () => download(`${this.name}.matrix.tsv`, TALI.grid.stringify(cleanNumbers(DATA.distanceMatrix[this.name]), { sortRows: true, sortCols: true })))

	// 	// console.log('clean', cleanNumbers(DATA.distanceMatrix.locations))
	// }
	addDownload(data){
		for(let key in data)
			$(`#distance table.${this.name} tr.${key} a`).addEventListener('click', () => download(`${this.name}.${key}.matrix.tsv`, TALI.grid.stringify({ [key]: DATA.distanceMatrix[this.name][key] }, { sortRows: true, sortCols: true })))
	}
	time(time){
		$(`#distance li#${this.name}`).innerHTML = this.name + ` processed in ${time} seconds`
	}
	done() {
		startCorrelation()
	}
}
class TypingMatrix extends Matrix {
	name = 'typings'
	modifier(matrix){
		return matrix
	}
	stats(data) {
		for (let key in data) {
			let x = data[key]
			// $(`#distance table.${this.name}`).innerHTML += TEMPLATE.stat_dist(key, data[key])
			$(`#distance table.${this.name}`).innerHTML += `<tr class='${key}'> <td>${x.patients} ${key}</td> <td>${x.entries} entries</td> <td><a>tsv</a></td> </tr>`
			// $(`#distance table.${this.name} a`).addEventListener('click', () => download(`${this.name}.matrix.tsv`, TALI.grid.stringify({ [this.name]: DATA.distanceMatrix[this.name] }, { sortRows: true, sortCols: true })))
		}
		this.addDownload(data)
	}
	done() {
		showTypeChart(100)
		startCorrelation()
	}
}
class LocationMatrix extends Matrix {
	name = 'locations'
	modifier(matrix){
		return matrix
	}
	stats(data) {
		for (let key in data) {
			let x = data[key]
			// $(`#distance table.${this.name}`).innerHTML += TEMPLATE.stat_dist(key, data[key])
			$(`#distance table.${this.name}`).innerHTML += `<tr class='${key}'> <td>${key}</td> <td>${x.patients} patients</td> <td>${x.entries} entries</td> <td><a>tsv</a></td> </tr>`
			// $(`#distance table.${this.name} a`).addEventListener('click', () => download(`${this.name}.matrix.tsv`, TALI.grid.stringify({ [this.name]: DATA.distanceMatrix[this.name] }, { sortRows: true, sortCols: true })))
		}
		this.addDownload(data)
		// $(`#distance #${this.name}`).innerHTML = TEMPLATE.stat_dist(this.name, data)
		// $(`#distance #${this.name} a`).addEventListener('click', () => download(`${this.name}.matrix.tsv`, TALI.grid.stringify(cleanNumbers(DATA.distanceMatrix[this.name]), { sortRows: true, sortCols: true })))
	}

}
export const matrix_typings = new TypingMatrix()
export const matrix_locations = new LocationMatrix()



export function startCorrelation() {
	if (!(DATA.distanceMatrix.typings && DATA.distanceMatrix.locations)) return
	// $('#distance-chart').innerHTML = TEMPLATE.chart_typings()
	// $$('#distance-chart a.chart').map(x => x.addEventListener('click', event => showTypeChart(event.target.id)))
	console.log('start correlation', DATA, getCorrelationSettings())
	// DATA.correlation = {}
	WORKER.correlation.postMessage([DATA.filtered, DATA.distanceMatrix, getCorrelationSettings()])
}




export const correlation = new class {
	start() {
		$(`#correlation>ul`).innerHTML = ''
	}
	TI(data) {
		$(`#correlation>ul`).innerHTML += `<li>removed ${data.dropped} sequence-pairs with more than ${getCorrelationSettings().TI} days between them</li>`
	}
	TD(data) {
		$(`#correlation>ul`).innerHTML += `<li>removed ${data.dropped} sequence-pairs with distance > ${getCorrelationSettings().TD}</li>`
	}
	CL(data) {
		$(`#correlation>ul`).innerHTML += `<li>${getCorrelationSettings().CL}-location has ${data.count} locations-pairs</li>`
	}
	CI(data) {
		$(`#correlation>ul`).innerHTML += `<li>removed ${data.dropped} locations-pairs with more than ${getCorrelationSettings().CI} days between them</li>`
	}
	CD(data) {
		$(`#correlation>ul`).innerHTML += `<li>not yet implemented</li>`
	}
	// cgmlst(data) {
	// 	console.log('corr cgmlst',data)
	// 	// show(`#correlationResult #typings [hidden]`)
	// 	// $(`#correlationResult #typings .count`).innerHTML = `${data.count} pairs`
	// }
	// location(data) {
	// 	show(`#correlationResult #locations [hidden]`)
	// 	$(`#correlationResult #locations .count`).innerHTML = `${data.count} pairs`
	// }
	correlate(data) {
		DATA.correlation[getCorrelationString()] = data
		console.log("CORR",DATA.correlation)
		// for(let dist in data)
		// data[dist].percentage = data[dist].percentage.toFixed(1) + '%'
		// showCorrelationTables()
		// showCorrelationChart()
		showCorrelationResults()
	}



}









// WORKER.correlation.onmessage = event => {
// 	let [action, data] = event.data
// 	if (action == 'TI')
// 		$(`#correlation #ti .help`).innerHTML = `removed ${data.dropped} sequence-pairs`
// 	if (action == 'TD')
// 		$(`#correlation #td .help`).innerHTML = `removed ${data.dropped} sequence-pairs`
// 	if (action == 'CL')
// 		$(`#correlation #cl .help`).innerHTML = `${data.count} locations-pairs`
// 	if (action == 'CI')
// 		$(`#correlation #ci .help`).innerHTML = `removed ${data.dropped} locations-pairs`
// 	if (action == 'CD')
// 		$(`#correlation #cd .help`).innerHTML = `not yet implemented`

// 	if (action == 'cgmlst') {
// 		// DATA.correlation.typings = data.typings
// 		// console.log('correlation', DATA)
// 		// console.log('cor mro', DATA.correlation.typings)
// 		// rowsAndCols(DATA.correlation.typings, 'corr')
// 		show(`#correlationResult #typings [hidden]`)
// 		$(`#correlationResult #typings .count`).innerHTML = `${data.count} pairs`
// 	}
// 	if (action == 'location') {
// 		// DATA.correlation.location = data.location
// 		show(`#correlationResult #locations [hidden]`)
// 		$(`#correlationResult #locations .count`).innerHTML = `${data.count} pairs`
// 	}
// 	if (action == 'correlate') {
// 		// console.log('correlate22', data)
// 		DATA.correlation[getCorrelationString()] = data
// 		// for(let dist in data)
// 		// data[dist].percentage = data[dist].percentage.toFixed(1) + '%'
// 		showCorrelationTables()
// 		showCorrelationChart()
// 	}
// }





// ['typings', 'locations'].map(name => {
// 	console.log('worker_', name, WORKER['matrix_' + name], WORKER.input)
// 	WORKER['matrix_' + name].onmessage = event => {
// 		// console.log('worker message', name)
// 		let [action, data] = event.data
// 		if (action == 'progress') {
// 			let [current, total] = data
// 			$(`#distance #${name} progress`).value = current
// 			$(`#distance #${name} progress`).max = total
// 			// $(`#distance #${name} .current`).innerText = current
// 			// $(`#distance #${name} .total`).innerText = total
// 		}
// 		if (action == 'result') {
// 			// if (name == 'cgmlst')
// 			// rowsAndCols(data, 'dist')
// 			// console.log(name, 'done', data)
// 			DATA.distanceMatrix[name] = data
// 			// show(`#distance #${name} [hidden]`)
// 			startCorrelation()
// 			// if (name == 'cgmlst')
// 		}
// 		if (action == 'stats') {
// 			console.log('distance stats', data)
// 			$(`#distance #${name}`).innerHTML = TEMPLATE.stat_dist(name, data)
// 		}
// 	}
// })




// WORKER.pseudonymize.onmessage = event => {
// 	let [action, data] = event.data
// 	if (action == 'progress') {
// 		let [current, total] = data
// 		$(`#filter-stats .pseudo progress`).value = current
// 		$(`#filter-stats .pseudo progress`).max = total
// 		// $(`#filter #pseudonymize progress`).value = current
// 		// $(`#filter #pseudonymize progress`).max = total
// 	}
// 	if (action == 'result') {
// 		// console.log('pseudo', 'done', data)
// 		DATA.filtered = data[0]
// 		DATA.PSEUDO = data[1]
// 		$('#filter-stats .pseudo').innerHTML = `pseudonymized all ids in ${((Date.now() - TIMER.pseudo) / 1000).toFixed(1)} seconds    <a class='download'> tsv </a>`
// 		$('#filter-stats .pseudo .download').addEventListener('click', () => download(`pseudonym.mapping.tsv`, TALI.grid.stringify(DATA.PSEUDO, { sortCol: 'count', pretty: 4 })))
// 		// $('#filter #pseudonymize .download').innerHTML = ` <a> download </a>`
// 		// $('#filter #pseudonymize .download a').addEventListener('click', () => download(`pseudonym.mapping.tsv`, TALI.grid.stringify(DATA.PSEUDO, { sortCol: 'count', pretty: 4 })))
// 		calculateDistanceMatrices()
// 		// $(`#distance #${name} [hidden]`).hidden = false
// 	}
// }




// let event = x => {
// console.log('corrrr', getCorrelationSettings())
// console.log('yeah'); return
// let [action, data] = event.data
// let total = { rows: Object.values(DATA.parsed.typings).length, cols: Object.values(Object.values(DATA.parsed.typings)[0]).length }
// if (action == 'from')
// 	$(`#filter-stats`).innerHTML += `<li>removed ${data[0]} typings and ${data[1]} locations < ${getFilterSettings().from}</li>`
// // $(`#filter #from .help`).innerHTML = `removed ${data[0]} typings and ${data[1]} locations`
// if (action == 'till')
// 	$(`#filter-stats`).innerHTML += `<li>removed ${data[0]} typings and ${data[1]} locations > ${getFilterSettings().till}</li>`
// // $(`#filter #till .help`).innerHTML = `removed ${data[0]} typings and ${data[1]} locations`
// if (action == 'rows') {
// 	DATA.filterStats.rows = data.stats
// 	$(`#filter-stats`).innerHTML += `<li class='rows'>removed ${data.dropped}/${total.rows} typings that had less than ${data.cutoffPercentage}% or ${data.cutoffValue}/${data.maxEntries} values <a class='download'>tsv</a></li>`
// 	// $('#filter-stats .rows .download').addEventListener('click', () => download(`typing.rows.tsv`, TALI.grid.stringify({ '': data.stats }, { sortCol: 'count', pretty: 4 })))
// 	// $('#filter-stats .rows .download').addEventListener('click', () => console.log('jo'))
// 	// $(`#filter #rows .help`).innerHTML = `removed ${data.dropped}/${total.rows} typings that had less than ${data.cutoffValue}/${data.maxEntries} values`
// 	// $('#filter #rows .download').innerHTML = ` <a> download </a>`
// 	// $('#filter #rows .download a').addEventListener('click', () => download(`typing.rows.tsv`, TALI.grid.stringify({ '': data.stats }, { sortCol: 'count', pretty: 4 })))
// }
// if (action == 'cols') {
// 	DATA.filterStats.cols = data.stats
// 	$(`#filter-stats`).innerHTML += `<li class='cols'>removed ${data.dropped}/${total.cols} type-columns that had less than ${data.cutoffPercentage}% or ${data.cutoffValue}/${data.maxEntries} values <a class='download'>tsv</a></li>`
// 	// $(`#filter #cols .help`).innerHTML = `removed ${data.dropped}/${total.cols} type-columns that had less than ${data.cutoffValue}/${data.maxEntries} values`
// 	// $('#filter #cols .download').innerHTML = ` <a> download </a>`
// 	// $('#filter #cols .download a').addEventListener('click', () => download(`typing.cols.tsv`, TALI.grid.stringify({ '': data.stats }, { sortCol: 'count', pretty: 4 })))
// }
// if (action == 'hasRoom')
// 	$(`#filter-stats`).innerHTML += `<li>removed ${data} locations from patients without room-entries</li>`
// // $(`#filter #hasRoom .help`).innerHTML = `removed ${data} locations`
// if (action == 'matchingPatients')
// 	$(`#filter-stats`).innerHTML += `<li>removed ${data.typings} typings and ${data.locations} locations that didnt have corresponding patient-ids</li>`
// // $(`#filter #matchingPatients .help`).innerHTML = `removed ${data.typings} typings and ${data.locations} locations`

// 	if (action == 'stat') {
// 		console.log('-------stat', data)
// 		for (let type in data)
// 			$('#filter-state').innerHTML += TEMPLATE.stat_list(type, data[type]) //+ 		`<hr/>` + TEMPLATE.listStats(getAllPatientAndEntryCounts(DATA.parsed))

// 	}
// 	if (action == 'result') {
// 		DATA.filtered = data
// 		// $('#filter-state').innerHTML = `<hr/>` + TEMPLATE.stat_list(getAllPatientAndEntryCounts(DATA.filtered)) //+ 		`<hr/>` + TEMPLATE.listStats(getAllPatientAndEntryCounts(DATA.parsed))

// 		// for (let x of PARTS) {
// 		// $('#filter-stats').innerHTML = `<hr/>` + TEMPLATE.listStats(getAllPatientAndEntryCounts(DATA.filtered))

// 		// $(`#filterResults #${x} .help`).innerHTML = showEntriesAndPatients(DATA.filtered[x])
// 		// show(`#filterResults #${x} a`)
// 		// }

// 		if (getFilterSettings().pseudonymize) {// optionally anonymize all data
// 			// $('#filter #pseudonymize .help').innerHTML = `<progress value="0" max="100"> </progress>`
// 			$('#filter-stats').innerHTML += `<li class='pseudo'> <progress value="0" max="100"> </progress> </li>`
// 			TIMER.pseudo = Date.now()
// 			WORKER.pseudonymize.postMessage(DATA.filtered)
// 		} else calculateDistanceMatrices()
// 	}
// }





// WORKER.map(workerName => (worker.onmessage = event => RESPONSE[worker]))

// let iniStat = {}

// WORKER.input.onmessage = event => {
// 	// console.log('IO worker', event.data)
// 	let [action, key, name, data] = event.data
// 	if (action == 'name')
// 		$(`#source .progress .${key}`).innerHTML = `start loading ${name}... `
// 	if (action == 'size')
// 		$(`#source .progress .${key}`).innerHTML += `transferred ${(data / 1024 / 1024).toFixed(1)} MB, now parsing... `
// 	if (action == 'time')
// 		$(`#source .progress .${key}`).innerHTML += `finished in ${(data / 1000).toFixed(1)} seconds`
// 	if (action == 'stat') {
// 		// iniStat[key] = data
// 		// if (Object.keys(DATA.parsed).length == 2) {
// 		$('#source .output').innerHTML += TEMPLATE.stat_list(key, data)
// 		// for (let key of iniStat)
// 		// $('#source #rows .download a').addEventListener('click', () => download(`typing.rows.tsv`, TALI.grid.stringify({ '': data.stats }, { sortCol: 'count', pretty: 4 })))
// 	}
// 	// }
// 	if (action == 'data') {
// 		DATA.parsed[key] = data
// 		if (Object.keys(DATA.parsed).length == 2)
// 			startFilter()
// 	}

// }

// function finishIO() {
// 	let TYPES = ['typings', 'locations']
// 	for (let type of TYPES)
// 		if (!DATA.parsed[type]) return

// 	console.log('FINISH DATA parsed', DATA.parsed)
// 	// console.log("STAT", iniStat)
// 	// $('#source .output').innerHTML = `<hr/>` + TEMPLATE.stat_list(getAllPatientAndEntryCounts(DATA.parsed))
// 	startFilter()
// }