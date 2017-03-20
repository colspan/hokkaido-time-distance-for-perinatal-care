'use strict'

import * as d3 from 'd3'
import * as L from 'leaflet'
//import * as Rickshaw from 'rickshaw'

import GeoJsonLoader   from './geojsonloader.js'
import LGeoJsonLayer   from './l_layer_geojson.js'
import LLegendControl  from './l_control_legend.js'
import LCaptionControl from './l_control_caption.js'
import GeoStatisticalData from './geostatisticaldata.js'
import { get_color_img, duration_to_color } from './color_helper.js'

L.Icon.Default.imagePath = './build/'
L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl: require('leaflet/dist/images/marker-icon.png'),
    shadowUrl: require('leaflet/dist/images/marker-shadow.png')
})

require('leaflet/dist/leaflet.css')
require('./app.css')


const statistical_data_files = {
    duration:"data/duration_of_matanity_delivery.csv",
    population_histogram:"data/population_histogram_of_each_commune_agg_by_duration_matanity_delivery.csv"
}
const map_data_files = {
    hospital_list:"data/hospital_list_matanity_delivery.csv"
}

// GeoJSONファイルの読み出し
function load_geojson(){
    var x = new GeoJsonLoader({geodata_files:['data/01_hokkaido_topo.json']})
    var geojson_loader = x.get_loader()
    return geojson_loader
}
// 統計データの読み込み
function load_csv_files(data_file_def){
    var promises = []
    Object.keys(data_file_def).forEach(key => {
        var data_file = data_file_def[key]
        var p = new Promise((resolve, reject) => {
            d3.csv(data_file, (error, data) => {
                if(error){
                    reject(error)
                    return
                }
                resolve(data)
            })
        })
        promises.push(p)
    })
    return new Promise((resolve, error)=>{
        Promise.all(promises).then(x => {
            var statistical_data = {}
            Object.keys(data_file_def).forEach( (key, i) => {
                statistical_data[key] = x[i]
            })
            resolve(statistical_data)
        })
    })
}

Promise.all([load_geojson(), load_csv_files(statistical_data_files), load_csv_files(map_data_files)])
       .then(start_app)

function start_app(loaded_data){
    var geo_obj = loaded_data[0]
    var statistical_data_csv = loaded_data[1]
    var map_data = loaded_data[2]
    var statistical_data = {}, map, lgeojson, lcaption, llegend, linfopanel

    // 起動処理
    prepare_statistical_data()
    create_elements()
    bind_statistical_data_to_ui()

    // 各機能
    // 統計データの前処理
    function prepare_statistical_data(){
        Object.keys(statistical_data_csv).forEach(k => {
           statistical_data[k] = new GeoStatisticalData(statistical_data_csv[k], geo_obj) 
        })
    }
    // 要素の生成
    function create_elements(){
        // GeoJSONレイヤーの初期化
        var lgeojson_option = {
            map_filler : d => {return 'rgba(255,255,255,0.2)'}
        }
        lgeojson = new LGeoJsonLayer(geo_obj, lgeojson_option)
        var leaflet_option = {
            zoom: 7,
            minZoom: 4,
            maxZoom: 18,
            center: lgeojson.centroid()
        }

        // Leaflet Objectの生成
        map = L.map('leaflet_map', leaflet_option)
        // 拡大縮小ボタン位置変更
        map.zoomControl.setPosition('bottomright')

        // OpenStreetMapの追加
        var osmUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        var osmAttrib = '&copy <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
        var osmOption = {
            attribution: osmAttrib,
            opacity:0.5
        }
        L.tileLayer(osmUrl, osmOption).addTo(map)

        // GeoJSONレイヤーを追加
        lgeojson.get().addTo(map)
        // 権利情報追記
        lgeojson.attributions().forEach( x => {
            map.attributionControl.addAttribution(x)
        })

        // 分娩可能な最寄り病院ヒートマップの追加
        var heatmapMatanityUrl = './data/tile_matanity_delivery/{z}/{x}/{y}.png'
        var heatmapMatanityOption = {
            opacity:1.0,
            maxNativeZoom: 10,
            bounds : [[45.4,139.1], [41.23,146.2]]
        }
        L.tileLayer(heatmapMatanityUrl, heatmapMatanityOption).addTo(map)

        // タイトルコントロールを追加
        lcaption = new LCaptionControl({
            title : '最寄りの分娩可能な産婦人科への時間距離',
            subtitle : '',
            subsubtitle : ''
        })
        map.addControl(lcaption.get())

        // 凡例コントロールを追加
        llegend = new LLegendControl({})
        map.addControl(llegend.get())

        // 情報パネルを追加
        var InfoPanel = L.Control.extend({
            options: {position: 'topright'},
            onAdd: map => {
                var container = L.DomUtil.create('div', 'info_panel')
                return container
            }
        })
        linfopanel = new InfoPanel() 
        map.addControl(linfopanel)

        // 病院リストレイヤーを追加
        var markers = []
        map_data.hospital_list.forEach(d=>{
            var point = [+d['latitude'],+d['longtitude']]
            var options = {
                title: d['hospital_name']
            }
            var marker = L.marker(point, options).bindPopup(options.title).addTo(map)
            markers.push(marker)
        });
    }

    // データをUIとひも付け
    function bind_statistical_data_to_ui(){
        var duration_data = statistical_data.duration.get_by_column_name('時間距離 平均')
        var population_data = statistical_data.duration.get_by_column_name('人口')

        // leafletのGeoJSONレイヤーとデータをひも付け

        // 書式生成
        var formatter = x => {
            var hour = parseInt(x/3600, 10)
            var min = parseInt(x%3600/60, 10) 
            var sec = parseInt(x%3600%60, 10)
            var formatted = ''
            if( hour > 0 ) formatted += hour+"時間"
            if( min > 0 ) formatted += min+"分"
            formatted += sec+"秒"
            return formatted
        }
        var color_scale = d3.scaleLinear().domain(duration_data.domain).range(["white", "#6a1b9a"])

        // ヒートマップの着色条件
        var map_filler = x => {
            var value = duration_data.parsed_data[x.commune_id]
            return color_scale(value*4.5)
        }

        // GeoJSONの各要素の書式設定
        var eachfeature = (parent, x, layer) => {
            var commune_id = x.commune_id
            var commune_name = x.properties.N03_003 == '札幌市' ? '札幌市' : x.name
            var target_value = formatter(duration_data.parsed_data[x.commune_id])
            var popup_elem = document.createElement('span')
            popup_elem.addEventListener('click', x => {
                // TODO
            })
            popup_elem.innerHTML = '<span class="layer_tooltip">' + commune_name + '</span>'
                                 + '<br /><span class="badge">平均 : ' + target_value + '</span>'
                                 + '<br /><span class="badge">人口 : ' + d3.format('0,d')(population_data.parsed_data[x.commune_id]) + '人</span>'
            layer.bindTooltip(popup_elem)
            var update_infopanel = () => {
                // 市町村名を表示する
                linfopanel._container.innerHTML = ''
                // タイトル
                var title_elem = document.createElement('h2')
                title_elem.innerHTML = x.name
                linfopanel._container.appendChild(title_elem)
                var commune_name = document.createElement('h3')
                commune_name.innerHTML = '時間距離別の人口'
                linfopanel._container.appendChild(commune_name)
                // ヒストグラムを表示する
                var histogram_data = statistical_data.population_histogram.data[x.commune_id]
                var plot_data = []
                Object.keys(histogram_data).slice(1, 20).forEach((key, i) => {
                    // データを整形する
                    plot_data.push({
                        from: i*15,
                        to: (i+1)*15,
                        key: key,
                        population: +histogram_data[key],
                        population_ratio:+histogram_data[Object.keys(histogram_data)[25+i]]
                    })
                })
                var histogram_table_elem = document.createElement('table')
                var histogram_thead_elem = document.createElement('thead')
                var histogram_tbody_elem = document.createElement('tbody')
                histogram_table_elem.appendChild(histogram_thead_elem)
                histogram_table_elem.appendChild(histogram_tbody_elem)
                linfopanel._container.appendChild(histogram_table_elem)
                const headers = [{name:'時間距離',width:50},{name:'人口',width:50},{name:'人口率',width:40}, {name:'',width:105}]
                headers.forEach(x=>{
                    var elem = document.createElement('th')
                    elem.innerHTML = x.name
                    elem.width = x.width
                    histogram_thead_elem.appendChild(elem)
                })
                var histogram_rows = d3.select(histogram_tbody_elem).selectAll('tr')
                    .data(plot_data)
                    .enter()
                    .append('tr')
                var cells = histogram_rows.selectAll('td')
                    .data(row=>{
                        var columns = []
                        var colors = Array.apply(null, Array(row.to-row.from)).map((_, i)=>{return duration_to_color((row.from+i)*60)})
                        columns.push( '〜' + row.to + '分' )
                        columns.push( d3.format('0,d')(row.population) )
                        columns.push( d3.format('.2%')(row.population_ratio) )
                        columns.push( '<img src="'+get_color_img(colors)+'" width="'+parseInt(row.population_ratio*100)+'" height="10">' )
                        return columns
                    })
                    .enter()
                    .append('td')
                    .html(d=>{ return d })
                    .style('text-align', (x,i)=>{return i<3?'right':'left'})
            }
            layer.on({
                mouseover: e => {
                    var style = {
                        weight: 5,
                        fillColor: '#dce775',
                        fillOpacity: 0.7
                    }
                    parent.getLayers()
                        .filter(y => {
                            if(x.properties.N03_003 == '札幌市'){
                                return y.feature.properties.N03_003 == x.properties.N03_003
                            }
                            else{
                                return y.feature.commune_id == commune_id
                            }
                        })
                        .forEach(y => {
                            y.setStyle(style)
                            if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
                                y.bringToFront()
                            }
                        })
                    e.target.openTooltip()
                    update_infopanel()
                },
                mouseout: e => {
                    parent.getLayers()
                        .filter(y => {
                            if(x.properties.N03_003 == '札幌市'){
                                return y.feature.properties.N03_003 == x.properties.N03_003
                            }
                            else{
                                return y.feature.commune_id == commune_id
                            }
                        })
                        .forEach(y => {
                            parent.resetStyle(y)
                        })
                    e.target.closeTooltip()
                },
                click: e => {
                }
            })

        }
        lgeojson.update({map_filler:map_filler, eachfeature:eachfeature})
    }

}


