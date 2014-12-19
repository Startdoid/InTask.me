//блок, который исполнит вебикс когда все загрузит
var implementFunction = (function() {
  var App = window.App;
  var webix = window.webix;
  var Backbone = window.Backbone;
  
  App.State = {
    $init: function() {
      this.segment                  = 'users';
      this.group                    = 0;
      this.groupstable_ItemSelected = 0;
      this.groupstable_ItemEdited   = null;
      this.tasktable_ItemSelected   = 0;
      this.tasktable_ItemEdited     = null;
    },
    segment           : 'users',  //groups, tasks, templates, finances, process, files, notes
    group             : 0,        //Выбранная группа, по которой фильтруются задачи
    //флаги состояния приложения this_view_action
    groupstable_ItemSelected  : 0,    //выделенный элемент в области конструктора групп
    groupstable_ItemEdited    : null, //редактируемый элемент в области конструктора групп
    tasktable_ItemSelected    : 0,    //выделенный элемент в области конструктора задач
    tasktable_ItemEdited      : null  //редактируемый элемент в области конструктора задач
  };
  
  var dataCountry = new webix.DataCollection({ 
    url:'api/country'
  });

  var dataCity = new webix.DataCollection({
    url:'api/city'
  });
  
  var dataFamilyStatus = new webix.DataCollection({
    url:'api/familystatus'
  });

  webix.ui({
		id:'suggestCountry', view:'suggest', data:dataCountry
	});
	
	webix.ui({
	  id:'suggestCity', view:'suggest', data:dataCity
	});
	
	webix.ui({
	  id:'suggestFamilyStatus', view:'suggest', data:dataFamilyStatus
	});
	
	webix.proxy.GroupData = {
    $proxy: true,
    init: function() {
      //webix.extend(this, webix.proxy.offline);
    },
    load: function(view, callback) {
      //Добавляем id вебиксовых вьюх для синхронизации с данными
  	  //важно добавлять уже после создания всех вьюх, иначе будут добавлены пустые объекты
      App.Trees.GroupTree.viewsAdd($$(view.config.id));
    }
  };
  
  webix.proxy.TaskData = {
    $proxy: true,
    init: function() {
      //webix.extend(this, webix.proxy.offline);
    },
    load: function(view, callback) {
      //Добавляем id вебиксовых вьюх для синхронизации с данными
  	  //важно добавлять уже после создания всех вьюх, иначе будут добавлены пустые объекты
      App.Trees.TaskTree.viewsAdd($$(view.config.id));
    }
  };

  var showInterface = function(enable) {
    if(enable) $$("toolbarHeader").enable(); else $$("toolbarHeader").disable();
    $$("toolbarHeader").refresh();
  };
  
  //создадим экземпляр бакбоновского роутера, который будет управлять навигацией на сайте
	App.Router = new (Backbone.Router.extend({
	  //слева роут, косая в скобках означает, что роут может быть как с косой чертой на конце, так и без нее
	  //справа функция, которая вызовется для соответствующего роута
		routes:{
			"login(/)":"login",
			"logout(/)":"logout",
			"register(/)":"register",
			"groups(/)":"groups",
			"tasks(/)":"tasks",
			"users(/)":"users",
			'home(/)':"home",
			'':"index"
		},
		//home выбрасывает в корень
		home:function() {
		  this.navigate('', {trigger: true});
		},
		//корень приложения
		index:function() {
		  if(App.User.get('id') === 0) {
        var promise = webix.ajax().get('api/logged', {}, function(text, data) {
          App.User.set({'usrLogged': data.json().usrLogged}, {silent: true});
          App.User.set({'id': data.json().id}, {silent: true});
          interfaceSelector();
	      });
	        
        promise.then(function(realdata){}).fail(function(err) {
          connectionErrorShow(err);
        });
		  } else {
		    interfaceSelector();
		  }
		},
		groups:function() {
		  this.navigate('', {trigger: true});
		},
		tasks:function() {
		  this.navigate('', {trigger: true});
		},
		users:function() {
		  this.navigate('', {trigger: true});
		},
		login:function() {
	    $$('frameCentral_Login').show();
	    //webix.UIManager.setFocus("formLogin");
		},
		logout:function() {
      var promise = webix.ajax().put("api/logout", { id: App.User.id });
	        
      promise.then(function(realdata) {
        defaultState();
        App.Router.navigate('', {trigger: true});
      }).fail(function(err){
        connectionErrorShow(err);
      });
		},
		register:function() {
	    $$('frameCentral_Register').show();
		}
	}))();
	
	//***************************************************************************
	//AFTER FETCH FUNCTIONs
  var showUserDataAfterFetch = function(User, response, options) {
    showInterface(true);
    
    $$('tabviewCentral_User').show();
    $$("tabviewCentral_User").hideProgress();
    
    if($$("frameUserList").getSelectedId() === '') {
      $$('frameUserList').select($$('frameUserList').getFirstId());
      App.Func.fillUserAttributes(App.User.get('id'));
    } else if ($$("frameUserList").getSelectedId() === $$('frameUserList').getFirstId()) {
      App.Func.fillUserAttributes(App.User.get('id'));
    } else {
      App.Func.fillUserAttributes($$("frameUserList").getSelectedId());
    }
    
    App.Collections.Groups.fetch({ success: showGroupDataAfterFetch });
  };
	
  var showGroupDataAfterFetch = function(Groups, response, options) {
    App.Trees.GroupTree.treeBuild(App.Collections.Groups.models);
    
    $$('treetableMyGroups_Groupstable').load('GroupData->load');
    $$('treeSlices_Groups').load('GroupData->load');
  };

  var showTaskDataAfterFetch = function(Tasks, response, options) {
    App.Trees.TaskTree.treeBuild(App.Collections.Tasks.models);
    
    $$('treetableMytasks_Tasktable').load('TaskData->load'); //!!!!!!!!!!!!!!!!!!!!!
  };

  //***************************************************************************
  //INTERFACE MANIPULATION
  var interfaceSelector = function() {
    //если пользователь залогинился
  	if(App.User.get('usrLogged')) {
  	  //Отрисовка интерфейса в зависимости от выбранного сегмента
  	  showInterface(true);
  	  switch(App.State.segment) {
        case 'users':
       	  $$("tabviewCentral_User").showProgress({
            type:"icon",
            delay:500
          });
  
          App.User.url = '/api/users/' + App.User.get('id');
          App.User.fetch({ success: showUserDataAfterFetch, silent:true });
  		        
          break;
        case 'groups':
          App.Collections.Groups.fetch({ success: showGroupDataAfterFetch });
          $$('tabviewCentral_Groups').show();
          break;
        case 'tasks':
          App.Collections.Tasks.fetch({ success: showTaskDataAfterFetch });
          $$('tabviewCentral_Task').show();
          break;
        case 'templates':
          // code
          break;
        case 'finances':
          break;
        case 'process':
          // code
          break;
        case 'files':
          // code
          break;
        case 'notes':
          // code
          break;
  	  }
  	} else {
  	  showInterface(false);
  	  $$('frameCentral_Greeting').show();
  	} //if(App.User.usrLogged)    
  };
  
  var connectionErrorShow = function(err) {
    if(err.status === 434) {
      defaultState();
      App.Router.navigate('', {trigger: true});
    }
    webix.message({type:"error", text:err.responseText});
  };

  //***************************************************************************
  //INIT FUNCTIONs
  var UserModelInit = function() {
    //Инициализируем глобальный объект пользователя со всеми настройками приложения
  	App.User = new App.Models.User();
  	
  	App.User.on('change:thisTry', function() {
  	  //App.Router.navigate('home', {trigger:true} );
  	});
  	
    App.User.on('change', function(eventName) {
      App.User.save(App.User.changedAttributes());
    });  	
  };
  
  var GroupModelInit = function() {
  	App.Trees.GroupTree = new treeManager();
    
  	App.Collections.Groups = new collectionGroups();
  
  	App.Collections.Groups.on('add', function(grp) {
  	  App.Trees.GroupTree.treeAdd(grp);
  	});
  	
  	App.Collections.Groups.on('remove', function(ind) {
  	  App.Trees.GroupTree.treeRemove(ind);
  	});
  
    App.Collections.Groups.on('change', function(model, options) {
      App.Trees.GroupTree.treeChange(model);
      model.save();
    });
    
    App.Collections.Groups.on('move', function(currentPosId, newPosId, parentId) {
      App.Trees.GroupTree.move(currentPosId, newPosId, parentId);
    });
  };
  
  var TaskModelInit = function() {
    App.Trees.TaskTree = new treeManager();
    
    App.Collections.Tasks = new collectionTasks();
    
    App.Collections.Tasks.on('add', function(tsk) {
      App.Trees.TaskTree.treeAdd(tsk);
    });
    
  	App.Collections.Tasks.on('remove', function(ind) {
  	  App.Trees.TaskTree.treeRemove(ind);
  	});
  
    App.Collections.Tasks.on('change', function(model, options) {
      App.Trees.TaskTree.treeChange(model);
      model.save();
    });
    
    App.Collections.Tasks.on('move', function(currentPosId, newPosId, parentId) {
      App.Trees.TaskTree.move(currentPosId, newPosId, parentId);
    });    
  };
  
  var defaultState = function() {
    delete App.User;
    UserModelInit();
      
    delete App.Trees.GroupTree;
    delete App.Collections.Groups;
    GroupModelInit();
    
    delete App.Trees.TaskTree;
    delete App.Collections.Tasks;
    TaskModelInit();
    
    $$('treetableMytasks_Tasktable').clearAll();
    
    $$('treetableMyGroups_Groupstable').clearAll();
    $$('treeSlices_Groups').clearAll();
    
    $$('richselectHeader_Segments').setValue(1);
    
    $$('multiviewLeft').hide();
    $$('frameUserList').hide();
    $$('multiviewRight').hide();
  };
  
  //***************************************************************************
  //TREE MANAGER
  //объект организует работу с деревьями, для того что бы линейную бэкбоновскую коллекцию
  //разворачивать в древовидную структуру и выводить в webix-овые вьюхи
	var treeManager = function (collection) {
	  //древовидный массив
	  var tree = [];
	  var views = [];

    //рекурсивный перебор
    var treeRecursively = function(branch, list) {
      if (typeof branch === 'undefined') return null;
      var tr = [];
      for(var i=0; i<branch.length; i++)      
      {
          branch[i].data = treeRecursively(list[ branch[i].id ], list);
          tr.push(branch[i]);
      }
      return tr;
    };

    //функция рекурсивного обхода дерева, корень дерева представлен, как branch
    //ветка дерева содержится в массиве data корня branch т.е. branch->data[branch->data[branch->data]] и т.д.
    var recursively = function(branch, element, oper) {
      //проверка на то что корень является данными типа - объект
      if (typeof branch === 'undefined') return false;
      //проверка на то что корень не обнулен
      if (branch === null) return false;
      
      //Если родитель корневой элемент, то добавим в корень
      if ((oper === 'add') && (element.parent_id === 0)) {
        branch.push(element);
        return true;        
      } 

      for (var i = 0; i<branch.length; i++) {
        if (branch[i] === null) continue;
        
        if (oper === 'add') {
          if (element.parent_id === branch[i].id) {
            if ((branch[i].data === null) || (typeof branch[i].data === 'undefined')) {
              branch[i].data = [];
            }
            branch[i].data.push(element);
            return true;
          } else {
            if(recursively(branch[i].data, element, oper)) { return true }
          }
        } else {
          if (element.id === branch[i].id) {
            //var deletedElements = this.models.splice(delElementIndex, 1); ПОПРОБУЙ
            branch[i] = null;
            //delete branch[i];
            return true;
          }
          else
          {
            if(recursively(branch[i].data, element, oper)) { return true }
          }
        }
      }
    };

    this.treeBuild = function(collection) {
	    //преобразуем в линейный массив бэкбоновскую коллекцию (разворачиваем атрибуты объекта)
      var maplist = collection.map(function(object) { return object.attributes });
      if(maplist.length > 0) {
        //сгруппируем элементы массива по родителю
        var list = _.groupBy(maplist, 'parent_id');
        //рекурсивно перебирая сгруппированный массив построим дерево
        tree = treeRecursively(list[0], list);
      } else {
        tree = [];
      }
    };
    
    //добавление элемента в дерево, автоматическое обновление элементов во вьюхах из массива views
    this.treeAdd = function(element) {
      var result = recursively(tree, webix.copy(element.attributes), 'add');
      if(result) {
        //var currentItem = views[0].getItem(element.attributes.parent_id);
        //views[0].data.sync(tree);
        for (var i = views.length; i--; ) {
          //var insertIndex = tree.getIndexById(element.attributes.parent_id);
          views[i].add(webix.copy(element.attributes), -1, element.attributes.parent_id);
          views[i].refresh();
        }
      }
    };
    
    this.treeRemove = function(element) {
      var result = recursively(tree, element.attributes, 'delete');
      if(result) {
        for (var i = views.length; i--; ) {
          views[i].remove(element.attributes.id);
          views[i].refresh();
        }
      }
    };
    
    this.treeChange = function(element) {
      for (var i = views.length; i--; ) {
        var record = views[i].getItem(element.get('id'));
        var chgAtr = element.changedAttributes();
        var keysArr = _.keys(chgAtr);
        var valuesArr = _.values(chgAtr);
        for (var j = keysArr.length; j--; ) {
          record[keysArr[j]] = valuesArr[j];
        }
        views[i].refresh();
      }
    };
    
    this.move = function(currentPosId, newPosId, parentId) {
      for (var i = views.length; i--; ) {
        //var newPosIndex = views[i].getBranchIndex(newPosId, views[i].getParentId(newPosId));
        //views[i].move(currentPosId, newPosIndex, null, { parent: views[i].getParentId(newPosId) });
        //views[i].refresh();
        var newPosIndex = views[i].getBranchIndex(newPosId, parentId);
        views[i].move(currentPosId, newPosIndex, null, { parent: parentId });
        views[i].refresh();
      }      
    };
    
    //добавление вьюхи в массив для датабиндинга
    this.viewsAdd = function(view) {
      if (typeof view === 'object')
      {
        //добавим в массив, если нет такой
        if(views.indexOf(view) === -1) {
          views.push(view);
          
          //обновим вновь добавленную вьюху информцией из дерева
          view.clearAll();
          view.parse(JSON.stringify(tree));
        }
      }
    };
    
    //удаление вьюхи из массива датабиндинга
    this.viewsDelete = function(view) {
      console.log('view delete');
    };
    
    //если при создании объекта передан не пустой параметр, то формируется дерево
	  if (typeof collection !== 'undefined')
	  {
	    this.treeBuild(collection);
	  }
  };

  //_.extend(App.Collections.Groups, Backbone.Events);
  UserModelInit();
  GroupModelInit();
  TaskModelInit();

  //вебикс конфигурация основного окна загруженная в экземпляр объекта вебиксового менеджера окон
  //описание внизу модуля
  var frameBase = new webix.ui({
    id:"frameBase",
    rows:[App.Frame.toolbarHeader, 
      { cols: [App.Frame.multiviewLeft, App.Frame.multiviewCentral,  App.Frame.frameUserList, App.Frame.multiviewRight] }
    ]
  });

  webix.extend($$("tabviewCentral_User"), webix.ProgressBar);
  
  $$("multiviewLeft").hide();
  $$("multiviewRight").hide();
  $$("frameUserList").hide();
  
  webix.UIManager.addHotKey('enter', function() { 
    if($$('frameCentral_Register').isVisible()) {
      App.Func.Register();
    } else if($$('frameCentral_Login').isVisible()) {
      App.Func.Login();
    }
  });
  
  $$('treetableMyGroups_Groupstable').attachEvent('onAfterEditStart', function(id) {
    App.State.groupstable_ItemEdited = id;
  });

  $$('treetableMyGroups_Groupstable').attachEvent('onAfterEditStop', function(state, editor, ignoreUpdate) {
    var ItemEdited = App.State.groupstable_ItemEdited;
    var ItemSelected = App.State.groupstable_ItemSelected;
    if (editor.column === 'name') {
      if(ItemEdited != ItemSelected) {
        this.getItem(ItemEdited).name = state.old;
        this.updateItem(ItemEdited);
        App.State.groupstable_ItemEdited = null;
      } else {
        var selectGroup = App.Collections.Groups.get(App.State.groupstable_ItemEdited);
        selectGroup.set({ 'name': state.value });
      }
    }
  });
  
  $$('treetableMytasks_Tasktable').attachEvent('onAfterEditStart', function(id) {
    App.State.tasktable_ItemEdited = id;
  });

  $$('treetableMytasks_Tasktable').attachEvent('onAfterEditStop', function(state, editor, ignoreUpdate) {
    var ItemEdited = App.State.tasktable_ItemEdited;
    var ItemSelected = App.State.tasktable_ItemSelected;
    if (editor.column === 'name') {
      if(ItemEdited != ItemSelected) {
        this.getItem(ItemEdited).name = state.old;
        this.updateItem(ItemEdited);
        App.State.tasktable_ItemEdited = null;
      } else {
        var selectTask = App.Collections.Tasks.get(App.State.tasktable_ItemEdited);
        selectTask.set({ 'name': state.value });
      }
    }
  });
  
  showInterface(false);

  webix.i18n.parseFormatDate = webix.Date.strToDate("%Y/%m/%d");
  webix.event(window, "resize", function() { frameBase.adjust(); });
  Backbone.history.start({pushState: true, root: "/"});
});