'use strict'

function get_color_img(colors){
    var canvas = document.createElement("canvas");
    var ctx = canvas.getContext('2d')
    canvas.width = colors.length
    canvas.height = 1
    ctx.clearRect(0,0,canvas.width,canvas.height)
    colors.forEach((color,i)=>{
        ctx.fillStyle = color
        ctx.fillRect(i,0,1,1)
    })
    return canvas.toDataURL()
}

/*
   0分 :  60 deg, 1.0, 0.5 # yellow
  15分 : 120 deg, 1.0, 0.5 # green
  30分 : 180 deg, 1.0, 0.5 # cyan
  45分 : 240 deg, 1.0, 0.5 # blue
  60分 : 300 deg, 1.0, 0.5 # magenta
 120分 : 300 deg, 1.0, 0.0 # black
 Opacityは30分から360分まで線形で消えていく
*/
function duration_to_color(second){
    var opacity_ratio
    var hsl_hue = (+second)/3600*(300-60)+60
    if (hsl_hue > 300){
        // 超えていたら300になおす
        hsl_hue = 300
    }
    if (second > 1800){
        //30分を超えていたら360分まで線形で消えていく
        opacity_ratio = 1.0 - (+second-1800)/(330*60)
        if (opacity_ratio < 0){
            // 0を下回っていたら0にする
            opacity_ratio = 0.0
        }
    }
    else{
        opacity_ratio = 1.0
    }
    var color = 'hsl('+ hsl_hue + ',100%, '+parseInt(50*opacity_ratio,10)+'%)'
    return color
}

export {get_color_img, duration_to_color}
