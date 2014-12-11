var mongoose = require('mongoose');
var autoIncrement = require('mongoose-auto-increment');

var groupSchema = mongoose.Schema({
  id: Number, //идентификатор группы
  parent_id: Number, //идентификатор родителя в иерархии групп
  owner_id: Number, //идентификатор владельца группы (пользователя)
  name: String, //наименование группы
  tasklist: [{ taskId: Number, permission: Number }], //список задач в составе группы
  picId: Number, //идентификатор лого группы
  visible: Number, //атрибут видимости группы: 
                   //0 - видно только владельцу, 
                   //1 - видно пользователям группы, 
                   //2 - видно всем (публичная группа)
  visiblelist: [] //список пользователей группы
});

groupSchema.plugin(autoIncrement.plugin, { model: 'group', field: 'id' });
var groupModel = mongoose.model('group', groupSchema);

module.exports = {
  model: groupModel,
  getGroupById: function(id, callback) {
    groupModel.findOne({ id : id }, function(err, group) {
      if (err) return callback("GroupDbError");
      if (group === null) return callback("NoGroup");
  
      callback(null, group.toObject());
    });
  },
  getGroups: function(user, filter, callback) {
    if(user === null) return callback("NeedUser");
    
    var arrGrId = user.grouplist.map(function(object) { return object.groupId });
    groupModel.find({ id: { $in: arrGrId }  }, function(err, groups) {
      if (err) return callback("GroupDbError");
      
      callback(null, groups);
    });
  },
  getPublicGroups: function(user, filter, callback) {
    if(user === null) return callback("NeedUser");
    
    groupModel.find({ visible: 2  }, function(err, groups) {
      if (err) return callback("GroupDbError");
      
      callback(null, groups);
    });
  }
};