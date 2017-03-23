'use strict'

import * as d3 from 'd3'
import * as L from 'leaflet'

// データ説明枠
export default class LCaptionControl{
  constructor(options){
    var defaults = {
      title : 'title',
      subTitle : 'subTitle',
      subSubTitle : 'subSubTitle',
      captionSizes : [32, 20, 20]
    }
    this.options = Object.assign(defaults, options)

    const captions = ['title', 'subTitle', 'subSubTitle']
    var self = this
    var captionWindow = L.Control.extend({
      options: {
        position: 'topleft'
      },
      onAdd: function(map){
        var container = L.DomUtil.create('div', 'captionWindow')

        // Caption
        self.captionContainer = d3.select(container)
        self.captionContainer.selectAll('div')
          .data(captions)
          .enter()
          .append('div')
          .style('font-size',function(d,i){return self.options.captionSizes[i]+'pt'})
          .text(function(d){return self.options[d]})

        return container
      }
    })
    this.control = new captionWindow()
  }
  get(){
    return this.control
  }
  update(options){
    this.options = Object.assign(this.options, options)
    var self = this
    var captionElems = this.captionContainer.selectAll('div')
        .text(function(d){return self.options[d]});
  }
}
