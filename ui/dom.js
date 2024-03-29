export let $ = x => document.querySelector(x)
export let $$ = x => [...document.querySelectorAll(x)]


export function download(filename, text) {
	var element = document.createElement('a');
	element.setAttribute('href', 'data:text/tsv;charset=utf-8,' + encodeURIComponent(text));
	element.setAttribute('download', filename);
	element.style.display = 'none';
	document.body.appendChild(element);
	element.click();
	document.body.removeChild(element);
}





// export function show(path) {
// 	try {
// 		$(path).hidden = false
// 	} catch { }
// }
// export function hide(path) {
// 	try {
// 		$(path).hidden = false
// 	} catch { }
// }
