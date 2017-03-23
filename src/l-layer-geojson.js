'use strict'

import * as d3 from 'd3'
import * as L from 'leaflet'

export default class LGeoJsonLayer{
    constructor(geoObj, options){
      var defaults = {
        mapFiller : d => {return '#ffffff'},
        strokeFiller: "hsl(80,100%,0%)",
        onClick : null,
        eachFeature : (p,x,l) => {l.bindTooltip(x.name)},
      }
      this.options = Object.assign(defaults, options)
      this.geoObj = geoObj

      var projection, path
      var self = this

      // Leaflet起動
      this.layer = L.geoJson(this.geoObj.geodata, {
        style: d => {
          return {
            color:"#222",
            weight:0.3,
            opacity: 0.6,
            fillOpacity: 0.6,
            fillColor: self.options.mapFiller(d)
          }
        },
        onEachFeature: (d,l) => {
          self.options.eachFeature(self.layer, d, l)
        }
      })
    }
    centroid(){
      var centroid = d3.geoCentroid(this.geoObj.geodata)
      return [centroid[1], centroid[0]]
    }
    get(){
      return this.layer
    }
    attributions(){
      // 権利情報追記
      return [
        '&copy; <a href="http://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N03.html">国土数値情報 行政区域データ</a>',
        'CC BY NC SA 4.0 <a href="https://github.com/colspan">Miyoshi(@colspan)</a>'
      ]
    }
    update(options){
      var self = this
      this.options = Object.assign(this.options, options)
      this.layer.getLayers().forEach(x => {
        self.layer.resetStyle(x)
        self.options.eachFeature(self.layer, x.feature, x)
      })
    }
    updatePartial(criteria, style){
      var self = this
      var openedTooltip = false
      this.layer.getLayers().forEach(l => {
        if(l.__modifiedStyle){
          self.layer.resetStyle(l)
          l.closeTooltip()
          l.__modifiedStyle = false
        }
        if(criteria(l.feature)){
          l.__modifiedStyle = true
          l.setStyle(style)
          if(!openedTooltip){
            l.openTooltip()
            openedTooltip = true
          }
        }
      })
    }
}
