'use strict'

import * as d3 from 'd3'
import * as L from 'leaflet'

export default class LLegendControl{
  constructor(options){
    var defaults = {
      show_legend : true,
      color_scale : null
    }
    this.options = Object.assign(defaults, options)

    var self = this
    this.legendWindow = L.Control.extend({
      options: {
        position: 'bottomleft'
      },
      onAdd: map => {
        var container = L.DomUtil.create('div', 'legendWindow')

        // 凡例作成
        self.legendContainer = d3.select(container).append('svg')
          .attr("class", "legendQuant")
          .attr("preserveAspectRatio", "xMinYMax meet")
        if(self.options.show_legend && self.options.color_scale){
          this.update(self.options)
        }

        return container
      }
    })
    this.control = new this.legendWindow()

  }
  get(){
    return this.control
  }
  update(options){
    this.options = Object.assign(this.options, options)
    //  凡例更新
    if(self.options.show_legend && self.options.color_scale){
    }
    var domain = options.color_scale.domain()
    var format_str
    if(options.format_str) format_str = options.format_str
    else format_str = (domain[0]%1===0 && domain[1]%1===0? ',.0f' : '0.2f' )
    var legend = d3.legendColor()
      .cells(11)
      .shapeWidth(50)
      .labelFormat(d3.format(format_str))
      .scale(options.color_scale)
    this.legendContainer.call(legend)
  }
}
