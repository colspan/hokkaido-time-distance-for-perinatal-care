'use strict'

import * as d3 from 'd3'
import * as topojson from 'topojson'

export default class GeoJsonLoader{
  constructor(options){
      var defaults = {
          geodata_files : [],
          exceptions:["色丹郡色丹村","国後郡泊村","国後郡留夜別村","択捉郡留別村","紗那郡紗那村","蘂取郡蘂取村", "所属未定地"],
      }
      this.options = Object.assign(defaults, options)
  }
  get_loader(){
    var geodata
    var communes = []
    var id_map = {}
    var self = this

    // 複数ファイルを非同期読み込み
    var promises = []
    this.options.geodata_files.forEach(d => {
      var p = new Promise((resolve, reject) => {
        // 読み込み処理
        d3.json(d, (error, loaded) => {
          if(error){
            reject(error)
            return
          }
          // TopoJSONデータ展開
          var geodata_fieldname = Object.keys(loaded.objects)[0]
          var geojson = topojson.feature(loaded, loaded.objects[geodata_fieldname])
          var exception_communes = self.options.exceptions; // 対象外の市町村
          var remove_list = []
          var communes = []
          function register(k,v){
            if(!id_map[k]) id_map[k] = []
            if(id_map[k].indexOf(v) == -1) id_map[k].push(v)
          }
          geojson.features.forEach((d,i) => {
            // 国土数値情報　行政区域データ向けのパーサ

            if(d.properties.N03_007=="") return; // 所属未定地等IDがないものは飛ばす

            // 市町村名を整理する
            d.commune_id = +d.properties.N03_007; // IDを代入
            d.prefecture = d.properties.N03_001
            d.name = ''
            if(d.properties.N03_003) d.name += d.properties.N03_003
            if(d.properties.N03_004) d.name += d.properties.N03_004

            if(exception_communes.indexOf(d.name) != -1){
              // 除外リストに存在すれば削除フラグを付与する
              remove_list.unshift(i)
            }
            else{
              // 除外リストになければ市町村一覧に追加
              if(communes.indexOf(d.name) == -1) communes.push(d.name)
            }

            // CSVの市町村名から白地図のIDに変換するmapを自動生成する
            // 政令指定都市 or 郡
            if(d.properties.N03_003){
              // 政令指定都市または郡単位でひと塗りとする
              register(d.properties.N03_003, d.commune_id)
              // 町村・区単位を連結する
              register(d.name, d.commune_id)
              // 郡の場合は町村のみにできるようにする
              if(d.properties.N03_003.slice(-1)=="郡"){
                register(d.properties.N03_004, d.commune_id)
              }
            }
            // 市
            if(d.properties.N03_004){
                register(d.properties.N03_004, d.commune_id)
            }
          })
          // 対象外の市町村を削除
          remove_list.forEach(d => {
            geojson.features.splice(d,1)
          });
          // 割り切り 同じ市町村名があると区別できない
          resolve({geojson:geojson,communes:communes,id_map:id_map})
        })
      })
      promises.push(p)
    })

    // 処理開始
    return new Promise((resolve, reject) => {
      Promise.all(promises).then(ready)
      function ready(results){
        var geodata
        results.forEach(d => {
          if(!geodata) geodata = d.geojson
          else geodata.features = geodata.features.concat(d.geojson.features)
          communes = communes.concat(d.communes)
          Object.keys(d.id_map).forEach(x => {
            id_map[x] = d.id_map[x]
          })
        })
        self.geodata = geodata
        self.communes = communes
        self.id_map = id_map
        resolve(self)
      }
    })
  }
}
