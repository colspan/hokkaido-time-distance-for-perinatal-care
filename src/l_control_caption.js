'use strict'

import * as d3 from 'd3'
import * as L from 'leaflet'

// データ説明枠
export default class LCaptionControl{
  constructor(options){
    var defaults = {
      title : 'title',
      subtitle : 'subtitle',
      subsubtitle : 'subsubtitle',
      caption_sizes : [32, 20, 20]
    }
    this.options = Object.assign(defaults, options)

    const captions = ['title', 'subtitle', 'subsubtitle']
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
          .style('font-size',function(d,i){return self.options.caption_sizes[i]+'pt'})
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
    var caption_elems = this.captionContainer.selectAll('div')
        .text(function(d){return self.options[d]});
  }
}
