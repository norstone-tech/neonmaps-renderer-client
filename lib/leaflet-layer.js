import {NeonmapsRendererImageAssembler} from "./image-assembler.js";
/**@type {import("leaflet")} */
const L = window.L || require("leaflet");
// const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
class NeonmapsRendererGridGetter extends L.GridLayer {
	/**
	 * 
	 * @param {NeonmapsRendererLayer} parent 
	 * @param {L.GridLayerOptions} options 
	 */
	constructor(parent, options){
		super(options);
		this.parent = parent;
		this._divElemContent = "";
	}
	/**
	 * @param {L.Coords} coords
	 * @returns {HTMLElement}
	 */
	createTile(coords){
		const elem = document.createElement("div");
		elem.innerHTML = this._divElemContent;
		this.parent._addViewportCoords(coords);
		return elem;
	}
	_removeTile(key){
		const tileData = this._tiles[key];
		if(!tileData){
			return;
		}
		super._removeTile(key);
		this.parent._removeViewportCoords(tileData.coords);
	}
};

/**
 * @typedef NeonmapsRendererLayerOptions
 * @property {string} [pane="tilePane"]
 * @property {string} [attribution]
 * @property {number} [imgSize=4096]
 * @property {number} [imgDivison=16]
 */
export class NeonmapsRendererLayer extends L.LayerGroup {
	/**
	 * @param {string} templateURL 
	 * @param {string} tileEndpoint 
	 * @param {NeonmapsRendererLayerOptions} optionsArg 
	 */
	constructor(templateURL, tileEndpoint, optionsArg = {}){
		/**@type {NeonmapsRendererLayerOptions} */
		const options = Object.assign(
			Object.create(NeonmapsRendererLayer.prototype.options),
			optionsArg
		);
		const gridGetter = new NeonmapsRendererGridGetter(this, {pane: options.pane});
		super([gridGetter], options);
		this.gridLayer = gridGetter;
		// this.imgSize = options.imgSize;
		// this.imgSizeZoom = Math.log2(this.imgSize) - 8;
		this.imgChunkSize = options.imgSize / options.imgDivison;
		this.imgChunkExponent = Math.log2(this.imgChunkSize);
		this.imgAssembler = new NeonmapsRendererImageAssembler(templateURL, tileEndpoint);
		this._viewportMinX = 0;
		this._viewportMinY = 0;
		this._viewportMaxX = 0;
		this._viewportMaxY = 0;
		this.imgAssembler.init().then(imgElem => {
			this.imgElem = imgElem;
			this.imgLayer = new L.SVGOverlay(imgElem, [[90, -180], [-90, 180]], {pane: options.pane});
		}).catch(ex => {
			console.error(ex);
			gridGetter._divElemContent = ex.name + ": " + ex.message;
		});
		// const svgLayer = new L.SVGOverlay
		

		// this.on("zoom",)
	}
	/**
	 * @param {L.Coords} coords 
	 */
	_growViewport(coords){
		const imgChunkZoom = this.imgChunkExponent - 8;
		const minX = Math.floor(
			(coords.x / 2 ** (coords.z + imgChunkZoom)) / this.imgChunkSize
		) * this.imgChunkSize;
		const minY = Math.floor(
			(coords.y / 2 ** (coords.z + imgChunkZoom)) / this.imgChunkSize
		) * this.imgChunkSize;
		const maxX = Math.ceil(
			((coords.x + 1) / 2 ** (coords.z + imgChunkZoom)) / this.imgChunkSize
		) * this.imgChunkSize;
		const maxY = Math.ceil(
			((coords.y + 1) / 2 ** (coords.z + imgChunkZoom)) / this.imgChunkSize
		) * this.imgChunkSize;
		if(minX < this._viewportMinX){
			this._viewportMinX = minX;
		}
		if(minY < this._viewportMinY){
			this._viewportMinY = minY;
		}
		if(maxX > this._viewportMaxX){
			this._viewportMaxX = maxX;
		}
		if(maxY > this._viewportMaxY){
			this._viewportMaxY = maxY;
		}
	}
	_applyViewport(){
		if(!this.imgElem){
			return;
		}
		const crs = this._map.options.crs;
		const imgChunkZoom = this.imgChunkExponent - 8;
		const viewBox = this.imgElem.viewBox.baseVal;
		viewBox.x = this._viewportMinX;
		viewBox.y = this._viewportMinY;
		viewBox.width = this._viewportMaxX - this._viewportMinX;
		viewBox.height = this._viewportMaxY - this._viewportMinY;
		this.imgLayer.setBounds([
			crs.pointToLatLng(L.point(this._viewportMinX, this._viewportMinY), imgChunkZoom),
			crs.pointToLatLng(L.point(this._viewportMaxX, this._viewportMaxY), imgChunkZoom)
		]);
	}
	/**
	 * @param {L.Coords} coords 
	 */
	_addViewportCoords(coords){
		this._growViewport(coords);
		this._applyViewport();
	}
	/**
	 * @param {L.Coords} coords 
	 */
	_removeViewportCoords(coords){
		this._viewportMinX = 0;
		this._viewportMinY = 0;
		this._viewportMaxX = 0;
		this._viewportMaxY = 0;
		// There's gotta be a better way to do this
		for(const k of this.gridLayer._tiles){
			const {coords} = this.gridLayer._tiles[k];
			this._growViewport(coords);
		}
		this._applyViewport();
	}
}
/**@type {NeonmapsRendererLayerOptions} */
NeonmapsRendererLayer.prototype.options = {
	pane: "tilePane",
	imgSize: 4096,
	imgPerAxis: 256
}
Object.setPrototypeOf(
	NeonmapsRendererLayer.prototype.options,
	L.LayerGroup.prototype.options
);
