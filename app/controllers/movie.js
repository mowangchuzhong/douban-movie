let _ = require('underscore') //引入extend，新object替换旧object中的字段
let Movie = require('../models/movie')
let Category = require('../models/category')
let Comment = require('../models/comment')
let fs = require('fs')
let path = require('path')

//detail page
exports.detail = function(req, res) {
    let id = req.params.id

    //每次进入电影详情页则该电影访客数pv加一
    Movie.update({ _id: id }, { $inc: { pv: 1 } }, function(err) {
        if (err) {
            console.log(err)
        }
    })

    Movie.findById(id, function(err, movie) {
        Comment
            .find({ movie: id })
            .populate('from', 'name')
            .populate('reply.from reply.to', 'name')
            .exec(function(err, comments) {
                console.log(comments)
                res.render('detail', {
                    title: '豆瓣电影 ' + movie.title,
                    movie: movie,
                    comments: comments
                })
            })

    })
}

//admin new page
exports.new = function(req, res) {
    Category.find({}, function(err, categories) {
        if (err) {
            console.log(err)
        }

        res.render('admin', {
            title: '豆瓣电影后台录入页',
            categories: categories,
            movie: {}
        })
    })

}

//admin update movie
exports.update = function(req, res) {
    let id = req.params.id

    if (id) {
        Movie.findById(id, function(err, movie) {
            Category.find({}, function(err, categories) {
                res.render('admin', {
                    title: '后台更新页面',
                    movie: movie,
                    categories: categories
                })
            })
        })
    }
}

//admin poster
exports.savePoster = function(req, res, next) {
    let posterData = req.files.uploadPoster;
    let filePath = posterData.path;
    let originalFilename = posterData.originalFilename;

    //有原始文件名就认为是有文件上传的
    if (originalFilename) {
        fs.readFile(filePath, function(err, data) {
            let timestamp = Date.now() //将当前时间作为时间戳来为上传文件命名
            let type = posterData.type.split('/')[1] //以/分隔，取后半部分作为类型
            let poster = timestamp + '.' + type
            let newPath = path.join(__dirname, '../../', '/public/upload/' + poster) //path.join():将多个参数组合成一个 path:'_dirname/../../public/upload/poster'

            fs.writeFile(newPath, data, function(err) {
                req.poster = poster;
                next();
            })
        })
    } else {
        next()
    }
}

//admin post movie
exports.save = function(req, res) {
    let id = req.body.movie._id
    let movieObj = req.body.movie
    let _movie

    //如果有上传的海报则放入movie中
    if (req.poster) {
        movieObj.poster = req.poster
    }

    if (id) {
        //已存在该电影，更新
        Movie.findById(id, function(err, movie) {
            if (err) {
                console.log(err)
            }

            let oldCategory = movie.category //更新前电影的分类

            _movie = _.extend(movie, movieObj);

            let newCategory = _movie.category //更新后电影分类

            _movie.save(function(err, movie) {
                if (err) {
                    console.log(err)
                }
                //更新category表
                if (oldCategory != newCategory) {
                    Category.findById(oldCategory, function(err, category) {
                        //清除原分类中的此电影
                        for (let i = 0; i < category.movies.length; i++) {
                            if (category.movies[i] == id) {
                                category.movies.splice(i, 1); //从第i个元素开始，删除一个元素
                                break;
                            }
                        }

                        category.save(function(err, category) {})

                        //在新分类中添加该电影
                        Category.findById(newCategory, function(err, category) {
                            if (err) {
                                console.log(err)
                            }

                            category.movies.push(movie._id)

                            category.save(function(err, category) {
                                res.redirect('/movie/' + movie._id)
                            })
                        })

                    })
                } else {
                    res.redirect('/movie/' + movie._id)
                }

            })
        })
    } else {
        //不存在该电影，新传入
        _movie = new Movie(movieObj)

        let categoryId = _movie.category

        _movie.save(function(err, movie) {
            if (err) {
                console.log(err)
            }

            Category.findById(categoryId, function(err, category) {
                if (err) {
                    console.log(err)
                }
                category.movies.push(movie._id)

                category.save(function(err, category) {
                    res.redirect('/movie/' + movie._id)
                })
            })
        })
    }
}

//list page
exports.list = function(req, res) {
        Movie.fetch(function(err, movies) {
            if (err) {
                console.log(err)
            }

            res.render('list', {
                title: '列表页面',
                movies: movies
            })
        })
    }
    /*exports.Save = function (req, res, next) {
    	let name = req.body.namespaceURI || ""
    	if (validator.trim(name).length == 0){
    		return RequestError(res, "error")
    	}
    	if (req.body._id){
    		Category.update({_id:req.body._id}, {$set:{name:name}},function (err) {
    			if (err)return MongodbError(res, err)
    			return res.json({success:true,message:"success"})
            })
    	}else {
            Category.create({name: name}, function(err){
                if(err) return MongodbError(res, err);
                return res.json({ success: true, message: '成功' });
            });
    	}
    }*/

//list delete movie
exports.del = function(req, res) {
    let id = req.query.id

    if (id) {
        Movie.remove({ _id: id }, function(err, movie) {
            if (err) {
                console.log(err)
            } else {
                res.json({ success: 1 })
            }
        })
    }
}