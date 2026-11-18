/**
 * 酷安 iOS 信息流净化（Quantumult X）
 * 目标版本：16.7.3（2026-11）
 * 说明：根据公开社区规则中已列出的酷安 API 字段/卡片过滤方式移植；
 *       并非对 16.7.3 安装包进行逐请求抓包后的保证清单。
 */
(function () {
  'use strict';

  const url = ($request && $request.url) ? $request.url : '';
  const body = ($response && $response.body) ? $response.body : '';

  let obj;
  try {
    obj = JSON.parse(body);
  } catch (e) {
    $done({});
    return;
  }

  if (!obj || typeof obj !== 'object') {
    $done({});
    return;
  }

  const hasId = item => item && item.id !== undefined && item.id !== null && item.id !== '';
  const hasEntityId = (item, ids) => item && ids.indexOf(Number(item.entityId)) !== -1;

  // 首页启动配置：删除推广入口，并清理卡片内部的推广实体。
  if (/\/v6\/main\/init(?:\?|$)/.test(url)) {
    const topLevelIds = [944, 945, 6390, 24455, 36839, 1635];
    const nestedIds = [1635, 2261, 1633, 413, 417, 1754, 1966, 2274, 1170, 1175, 1190, 2258];

    if (Array.isArray(obj.data)) {
      obj.data = obj.data
        .filter(item => !hasEntityId(item, topLevelIds) && (!item || item.title !== '关注'))
        .map(item => {
          if (!item || typeof item !== 'object') return item;
          if (Number(item.entityId) === 20131 && Array.isArray(item.entities)) {
            item.entities = item.entities.filter(entity => !entity || entity.title !== '酷品');
          }
          if (Array.isArray(item.entities)) {
            item.entities = item.entities.filter(entity =>
              !hasEntityId(entity, nestedIds) && (!entity || entity.title !== '关注')
            );
          }
          return item;
        });
    }
  }

  // 首页信息流：移除推广卡片及“精选配件”运营卡片。
  if (/\/v6\/main\/dataList(?:\?|$)/.test(url)) {
    if (Array.isArray(obj.data)) {
      obj.data = obj.data.filter(item =>
        item && item.entityTemplate !== 'sponsorCard' && item.title !== '精选配件'
      );
    }
  }

  // 首页 indexV8：移除推广卡、指定导流实体和“值得买/红包”类卡片。
  if (/\/v6\/main\/indexV8(?:\?|$)/.test(url)) {
    const blockedIds = [8639, 29349, 33006, 32557, 28621];
    if (Array.isArray(obj.data)) {
      obj.data = obj.data.filter(item => {
        if (!item || item.entityTemplate === 'sponsorCard' || hasEntityId(item, blockedIds)) return false;
        const title = String(item.title || '');
        return !/(值得买|红包)/.test(title);
      });
    }
  }

  // 帖子回复列表：过滤无正常动态 ID 的推广楼层。
  if (/\/v6\/feed\/replyList(?:\?|$)/.test(url)) {
    if (Array.isArray(obj.data)) obj.data = obj.data.filter(hasId);
  }

  // 帖子详情：剔除无 ID 推广楼层，并清空商品/推广卡字段。
  if (/\/v6\/feed\/detail(?:\?|$)/.test(url)) {
    if (obj.data && typeof obj.data === 'object' && !Array.isArray(obj.data)) {
      ['hotReplyRows', 'topReplyRows'].forEach(key => {
        if (Array.isArray(obj.data[key])) obj.data[key] = obj.data[key].filter(hasId);
      });
      ['detailSponsorCard', 'include_goods', 'include_goods_ids'].forEach(key => {
        if (Object.prototype.hasOwnProperty.call(obj.data, key)) obj.data[key] = [];
      });
    }
  }

  // 页面卡片：移除热议/热搜/推广卡及已知推广专题，并清理卡片内的推广实体。
  if (/\/v6\/page\/dataList(?:\?|$)/.test(url)) {
    const blockedIds = [36104, 24309, 12889, 21063, 35730, 35846, 28374, 28375, 27332, 20090, 28773, 29343, 21106];
    if (Array.isArray(obj.data)) {
      obj.data = obj.data
        .filter(item => {
          if (!item) return false;
          if (item.title === '话题热议' || item.title === '酷安热搜') return false;
          if (item.entityTemplate === 'imageScaleCard' || item.entityTemplate === 'sponsorCard') return false;
          return !hasEntityId(item, blockedIds);
        })
        .map(item => {
          if (item && Array.isArray(item.entities)) {
            item.entities = item.entities.filter(entity => !entity || entity.title !== '睡个好觉需要什么？');
          }
          return item;
        });
    }
  }

  // 我的页面卡片：移除文字链推广入口。
  if (/\/v6\/account\/loadConfig\?/.test(url) && /(?:^|[?&])key=my_page_card_config(?:&|$)/.test(url)) {
    const blockedIds = [1001, 1003, 1004, 1005];
    if (Array.isArray(obj.data)) {
      obj.data = obj.data
        .filter(item => item && item.entityType !== 'textLink' && !hasEntityId(item, blockedIds))
        .map(item => {
          if (item && Array.isArray(item.entities)) {
            item.entities = item.entities.filter(entity => !entity || entity.entityType !== 'textLink');
          }
          return item;
        });
    }
  }

  $done({ body: JSON.stringify(obj) });
})();
