
const domParser = new DOMParser();
export class NeonmapsRendererImageAssembler {
	/**
	 * @param {string} templateURL 
	 * @param {string} tileEndpoint 
	 */
	constructor(templateURL, tileEndpoint){
		this._initReqPromise = fetch(templateURL, {
			headers: {
				"Accept": "image/svg+xml"
			}
		});
	}
	/**
	 * @returns {Promise<SVGSVGElement>}
	 */
	async init(){
		if(this._initPromise == null){
			this._initPromise = (async () => {
				const xml = domParser.parseFromString(
					await (await this._initReqPromise).text(),
					"image/svg+xml"
				);
				/**@type {SVGSVGElement} */
				this.imageElem = xml.firstElementChild;
				if(!this.imageElem instanceof SVGSVGElement){
					throw new Error("SVG image doesn't have <svg> as its root element");
				}
				const viewBox = this.imageElem.viewBox.baseVal;
				if(viewBox.width != viewBox.height){
					throw new Error("SVG image is not a square");
				}
				// this.imgSize = viewBox.width;
			})();
		}
		await this._initPromise;
		return this.imageElem;
	}
	addTileCoord(x, y, z){

	}
	removeTileCoord(x, y, z){

	}
}
