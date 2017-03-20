'use strict'

import * as d3 from 'd3'

export default class GeoStatisticalData {
    constructor(input_data, geojson_obj) {
        this.data = {} // 自治体コードがキーの辞書
        this.data_multi_ids = {} // 政令指定都市向け辞書
        this.id_map = geojson_obj.id_map
        this.communes = geojson_obj.communes
        this.csv_keys = Object.keys(input_data[0])
        if (this.csv_keys.length < 2) {
            Materialize.toast('CSVファイル(2列以上のデータ)を入力してください。', 3000)
            clear_data()
            throw "Too Few Columns"
        }

        // 値の代入
        this.data_array = []
        input_data.forEach(x => {
            var commune_name = x[this.csv_keys[0]] // 1列目は自治体名(制約)
            if (commune_name == null || commune_name.length < 2) return // 文字列が短過ぎたらスキップ
            var commune_ids = this.id_map[commune_name] // 自治体IDを取得
            if (!commune_ids) return // 対応するIDが見つからない場合はスキップ
            this.data_array.push(x) // データ格納変数に代入
            commune_ids.forEach(i => {
                // データ辞書に代入
                this.data[i] = x
            })
            if (commune_ids.length > 1) this.data_multi_ids[commune_name] = x // 政令指定都市データを代入
        })

        // 各カラムの型の推定
        // TODO
    }
    get_by_column_name(column_name){
        var data_array = this.data_array
        var get_value = function(x) {
            try {
                var value
                value = x[column_name]
                if (typeof value == "string") {
                    if (value.match(/^(|-)([0-9]{1,3},)([0-9]{3},)*[0-9]{3}(|\.[0-9]+)$/)) {
                        // カンマ区切りの数値ならば
                        value = parseFloat(value.replace(",", ""))
                    } else if (value && value.match(/^(|-)[0-9]+(|\.[0-9]+)$/)) {
                        // 数値ならば
                        value = parseFloat(value)
                    }
                }
                return value
            } catch (e) {
                // データが無いならば
                return null
            }
        }
        var format = function(x) {
            if (isNaN(x)) return x
            var format_str = (+x % 1 === 0 && +x % 1 === 0 ? ',.0f' : '0.4f')
            return d3.format(format_str)(x)
        }
        // max,minを算出
        data_array.sort(function(a, b) {
            return d3.descending(get_value(a), get_value(b))
        })
        var max = d3.max(data_array, get_value)
        var min = d3.min(data_array, get_value)
        var domain, range
        if (min < 0 && max < 0) {
            domain = [min, max]
            range = ["white", "#ff5722"]
        } else if (min < 0 && max >= 0) {
            if (get_value(data_array[1]) > 0 && get_value(data_array[0]) / get_value(data_array[1]) > 3.0) {
                // 1位と2位の比率が3倍を超えるとき
                domain = [min, 0, get_value(data_array[1]), get_value(data_array[0])]
                range = ["#03a9f4", "white", "#ff5722", "#dd2c00"]
            } else {
                domain = [min, 0, max]
                range = ["#03a9f4", "white", "#ff5722"]
            }
        } else { // (min >= 0 && max >= 0)
            if (get_value(data_array[1]) > 0 && get_value(data_array[0]) / get_value(data_array[1]) > 3.0) {
                // 1位と2位の比率が3倍を超えるとき
                domain = [0, get_value(data_array[1]), get_value(data_array[0])]
                range = ["white", "#ff5722", "#dd2c00"]
            } else {
                domain = [0, max]
                range = ["white", "#ff5722"]
            }
        }
        // domainを切りのいい数字に正規化する
        var norm_domain = []
        domain.forEach(function(v) {
            if (v == 0) {
                norm_domain.push(v)
                return
            }
            var abs_v = Math.abs(v)
            var digits = Math.floor(Math.log(abs_v) / Math.log(10))
            var new_v = Math.floor(abs_v / Math.pow(10, digits - 1) + 1) * Math.pow(10, digits - 1)
            norm_domain.push(v > 0 ? new_v : -new_v)
        })
        domain = norm_domain

        // color_scale作成
        var color_scale = d3.scaleLinear().domain(domain).range(range);

        // 値をパースして取得
        var parsed_data = {}
        Object.keys(this.data).forEach(id => {
            parsed_data[id] = get_value(this.data[id])
        })

        return {
            parsed_data : parsed_data,
            data_array : data_array,
            column_name : column_name,
            color_scale : color_scale,
            domain : domain,
            range : range,
            norm_domain : norm_domain
        }
    }
    clear_data() {
        this.data = {}
        this.data_array = []
        this.csv_keys = []
    }
    get_format_expr(x) {
        if (isNaN(x)) return null
        else return (+x % 1 === 0 && +x % 1 === 0 ? ',.0f' : '0.4f')
    }

}