# M13 ui-ngx OTA 包管理操作面盘点（工作文档，agents 用）

> 由 scout-ngx(ota) 盘点产出（2026-09-06）。spec §5 的对照基准；随 M13 收尾可归档或删除。
> 范围：仅 OTA（ota-update）族。Edge 实体面由 scout-ngx-edge 另行盘点，见 `m13-ngx-inventory-edge.md`（如产出）。
> 术语：ngx 把 OTA 包叫 "OTA update / package"，实体枚举 `OTA_PACKAGE`，一个包 = 固件或软件的一个版本档案。

## 关键文件

- 路由/模块：`ui-ngx/src/app/modules/home/pages/ota-update/ota-update-routing.module.ts`、`ota-update.module.ts`
- 列表 config：`.../pages/ota-update/ota-update-table-config.resolve.ts`
- 实体表单（新增/编辑/详情三态共用，**无独立 dialog 文件**）：`.../pages/ota-update/ota-update.component.ts/.html`
- 详情页 tabs（仅 VC 一个扩展 tab）：`.../pages/ota-update/ota-update-tabs.component.ts/.html`
- 共享模型：`ui-ngx/src/app/shared/models/ota-package.models.ts`
- HTTP 服务：`ui-ngx/src/app/core/http/ota-package.service.ts`
- 消费侧选择器：`ui-ngx/src/app/shared/components/ota-package/ota-package-autocomplete.component.ts`
- 文案：`ui-ngx/src/assets/locale/locale.constant-en_US.json` 顶层 `ota-update.*` 段

## 1. 路由与权限

- 列表 `/features/otaUpdates`：auth=[TENANT_ADMIN]（`ota-update-routing.module.ts:37-47`）；详情 `/features/otaUpdates/:entityId`：TENANT_ADMIN + ConfirmOnExitGuard（:48-63）
- 旧路径 `/otaUpdates`、`/otaUpdates/:entityId` 301 到 `/features/*`（:68-78）
- 菜单：MenuId.otaUpdates 定义 `menu.models.ts:111`，菜单项 path=`/features/otaUpdates`、icon=memory（:768-777），挂在 **TENANT_ADMIN 段**的「Entities」分组（devices/gateways/assets/device_profiles/asset_profiles/entity_views 之后，:945-955）；CUSTOMER_USER 菜单段（:1028 起）无此项
- 后端权限矩阵（登记，`OtaPackageController.java`）：列表 `GET /api/otaPackages` 与按 profile 列表 TENANT+CUS（:168,187）；info 读 TENANT+CUS（:105）；**下载/读全量/保存/上传/删除均 TENANT_ADMIN only**（:81,117,132,145,213）
- 结论：前端页面 TENANT only；CUSTOMER_USER 仅有后端只读能力（供其设备侧消费），ngx 前端未暴露任何页面

## 2. 列表页 Packages repository（EntitiesTable 通用表壳）

- 表标题 "Packages repository"（resolver :131-134）；新增按钮 = 通用表默认 add（addEnabled 默认 true，`entities-table-config.models.ts:180`；表壳渲染 `entities-table.component.html:54-84`）
- 列（resolver :60-106）：createdTime(150px, 默认排序 createdTime DESC :192)/title(15%)/version(15%)/tag(15%)/type(15%，FIRMWARE/SOFTWARE 译名 :65-67)/direct-url(20%，超 20 字符截断 :69，**单元格内 copy 按钮**仅 url 存在时显示 :73-84)/fileName(20%)/dataSize(70px，FileSizePipe 人读格式 :86-88)/checksum(220px，`算法: 值` 超 20 字符截断 :155-161，同样带 copy 单元格按钮 :94-104)
- 搜索：默认启用（searchEnabled 默认 true :179），占位 "Search packages"（`entity-type.models.ts:356`）；后端 textSearch + 排序白名单 createdTime/type/title/version/tag/url/fileName/dataSize/checksum（controller :176）；分页默认 10/页（:195）
- **无 type（FIRMWARE/SOFTWARE）列表过滤器**——type 只作列展示；按 type 过滤仅存在于消费侧选择器（§7）。spec 定验收时不要把「type 过滤」写成 ngx 已有能力
- **无 JSON 导出/导入**：import-export 服务零引用 OTA（全仓 grep 无）；"exportPackage" 实为下载二进制（:144-153）
- 行点击 → 右侧详情抽屉（`entities-table.component.ts:449-453`，rowPointer 默认 false）；行内唯一操作「Download package」，enabled 条件 `hasData && !url`（resolver :108-115）→ URL 型包=新窗口打开外链，文件型=`GET /api/otaPackage/{id}/download`（:144-153）
- 删除：单条 + 批量，确认文案四件套（:117-121）；删除接口 `DELETE /api/otaPackage/{id}`（:126）

## 3. 新增表单字段级对照（isAdd 分支，`ota-update.component.*`）

> 形态说明：ngx 没有独立「新增对话框」——新增/编辑/详情是同一个 `OtaUpdateComponent` 表单，出现在右侧抽屉与独立详情页两处。antd 侧可自行选形态，操作面按字段对齐即可。

| 字段 | 控件/校验 | 联动 | 锚点 |
|---|---|---|---|
| title | 必填，≤255 | 编辑态 readonly | ts :106；html :68-81 |
| version | 必填，≤255 | 编辑态 readonly | ts :107；html :82-95 |
| tag（版本标签） | ≤255，选填 | **自动联想**：tag 保持 pristine 时 `tag = (title + ' ' + version).trim()` 实时填充；hint「应与设备上报的包版本匹配」 | ts :77-86；html :97-103 |
| deviceProfileId | 必填，tb-device-profile-autocomplete（禁新建/禁编辑 profile，带详情页跳链），hint「仅对所选 profile 的设备可见」 | 决定消费侧可见性 | ts :110；html :104-114 |
| type | FIRMWARE/SOFTWARE 下拉，必填，默认 FIRMWARE | 编辑态随表单整体锁死 | ts :47,109；html :115-124 |
| 保存警示 | 「Once the package is uploaded, you will not be able to modify title, version, device profile and package type」 | 仅新增态显示 | html :127 |
| 来源 radio | isURL：上传二进制文件（默认）/ 使用外部 URL | 驱动下方分支 | html :128-131 |
| file（二进制分支） | tb-file-input 必填，支持拖拽，workFromFileObj（选中后暂存表单，点保存才上传） | isURL=false 时 required | ts :67,122；html :136-144 |
| generateChecksum（二进制分支） | 复选框「Auto-generate checksum」，**默认勾选** | 勾选时隐藏算法+checksum 两个输入 | ts :123；html :145-170 |
| checksumAlgorithm | 7 值枚举下拉：MD5/SHA256(默认)/SHA384/SHA512/CRC32/MURMUR3_32/MURMUR3_128（`ota-package.models.ts:23-43`） | 仅未勾自动生成时可见 | ts :45,111 |
| checksum | ≤1020，选填，hint「留空则自动生成」 | 同上 | ts :112；html :162-168 |
| url（URL 分支） | 必填 + 非空 pattern | isURL=true 时显示；isURL=false 时清校验、file 转 required（双向联动） | ts :61-76；html :191-205 |
| description | 文本域自动增高，存 additionalInfo.description | 唯一编辑态仍可改的字段 | ts :115-119；html :206-211 |

- 提交清洗（prepareFormValue，ts :189-199）：URL 态删 file/checksum/checksumAlgorithm；文件态删 url；generateChecksum 只是 UI 开关不入 payload
- 保存链路**两步走**（service :73-88）：先 `POST /api/otaPackage` 建 info（刻意剥掉 file/checksum/checksumAlgorithm）→ 再 multipart `POST /api/otaPackage/{id}?checksumAlgorithm=X[&checksum=Y]` 传文件；**上传失败自动回滚删除刚建的 info**（:84 catchError→deleteOtaPackage）
- **checksum 由后端计算**：上传端点 checksum 参数 optional（controller :149-152），不传即由服务端按所选算法生成落库；前端 hint 文案同口径（locale `checksum-hint`）。前端从不本地算哈希

## 4. 编辑态与详情页

- **编辑近乎只读**：非新增态整个表单 disable、仅重新启用 additionalInfo.description（ts :150-153）；title/version/tag 另有 readonly 属性双保险；文件元信息 fileName/dataSize(bytes)/contentType 以只读输入框展示（html :171-188）
- 详情入口三处：抽屉、独立详情页路由、以及详情页顶部按钮组（html :18-63）
- 详情页按钮组（html :18-63）：Open details page（抽屉内显示、已在详情页隐藏 :19-24）/ Download package（disabled 条件 `hasData && !url` :25-30）/ Delete（:31-36）/ Copy package Id（:37-45）/ Copy checksum（有值才显示 :46-53）/ Copy direct URL（有值才显示 :54-61）；三者复制成功均有 toast（ts :156-187；注：direct-url 复用 checksum 的文案 key，上游小瑕疵）
- 详情页 tabs：基础 tab 即上述表单；另有 **Version Control tab**（tb-version-control，detailsMode+singleEntityMode，仅实体属于租户时显示）——Edge 快照式版本保存/恢复入口（`ota-update-tabs.component.html:18-25`、ts :37-39）；归属裁决见 §9 决策点
- 实体类型注册：名称/新增/空态/搜索文案（`entity-type.models.ts:348-358`）、帮助链接 key=otaUpdates（:620-624）、详情页 URL 约定 `/features/otaUpdates`（:691）

## 5. 服务端点全表（`ota-package.service.ts`）

| 方法 | 端点 | 用途 | 锚点 |
|---|---|---|---|
| getOtaPackages | GET /api/otaPackages | 列表（textSearch/分页/排序） | :51-53 |
| getOtaPackagesInfoByDeviceProfileId | GET /api/otaPackages/{deviceProfileId}/{type} | 消费侧按 profile+type 候选 | :55-59 |
| getOtaPackage | GET /api/otaPackage/{id} | 全量（含 data，TENANT only） | :61-63 |
| getOtaPackageInfo | GET /api/otaPackage/info/{id} | 详情（表单载入用这个） | :65-67 |
| downloadOtaPackage | GET /api/otaPackage/{id}/download | 二进制下载（附件头带 fileName） | :69-71 |
| saveOtaPackage | info POST + multipart POST 两步 | 见 §3；失败回滚 | :73-88 |
| uploadOtaPackageFile | POST /api/otaPackage/{id}?checksumAlgorithm=&checksum= | multipart 上传，checksum 可选 | :94-107 |
| deleteOtaPackage | DELETE /api/otaPackage/{id} | 删除 | :109-111 |
| countUpdateDeviceAfterChangePackage | GET /api/devices/count/{type}/{entityId} | 变更前统计受影响设备数 | :113-115 |
| confirmDialogUpdatePackage | 组合上者 | firmwareId/softwareId 变更时弹「将影响 N 台设备」确认（forkJoin 两类计数，0 不弹） | :117-144 |

## 6. 删除被引用行为（先验事实，前端无预检）

- 前端：确认弹窗只有通用警示「不可恢复」（resolver :117-121），无引用查询
- 后端：靠数据库外键兜底，四条约束各给明确报错——`fk_firmware_device`/`fk_software_device` → "The otaPackage/software referenced by the devices cannot be deleted!"，`fk_firmware_device_profile`/`fk_software_device_profile` → "…referenced by the device profile cannot be deleted!"（`dao/.../ota/BaseOtaPackageService.java:195-211`）
- 结论：被 device profile（或设备）引用的包**删不掉**，antd 侧按「提交后吃后端报错 toast」即为等价；做前端预检属增强项

## 7. device-profile / device 侧 OTA 消费点（只登记，M13 是否动它见决策点）

- device-profile 表单：firmwareId/softwareId 两个 tb-ota-package-autocomplete（非必填、带详情跳链、按本 profile 过滤）（`device-profile.component.html:96-111`；表单控件 ts :130-131）
- 保存门：saveDeviceProfileAndConfirmOtaChange 先走 §5 的变更确认弹窗再保存（`device-profile.service.ts:126-131`）
- device 表单：同款两个选择器，profile 换选时候选联动（`device.component.html:124-139`）
- 选择器行为（`ota-package-autocomplete.component.ts`）：候选=GET /api/otaPackages/{profileId}/{type}，页大小 50、按 title ASC（:264-279）；显示格式 `title (version)`（:260-262）；空态/未匹配文案按 FIRMWARE/SOFTWARE 两套（模型 :57-82）

## 8. 范围边界（不进 M13 OTA 段）

- Version Control tab（§4）→ VC 能力归 M14「VC 独立页」段裁决
- 设备侧固件分发/更新状态追踪（设备遥测 current_firmware_title 等）→ 设备域，不在 OTA 页
- CUSTOMER_USER 的后端只读能力（§1）→ 前端不建入口，登记权限契约一条即可
- i18n 仅盘 en；zh_CN 文案由实现波自定

## 9. 工作量分级 + 裁决点

**工作量**：OTA 族单页 + 表单，无向导、无 stepper，整族量级 ≈ M12 的 templates 一页偏上；最重处是「两步保存 + 失败回滚」的保存链路、isURL 双分支字段联动、以及与 device-profile/device 两个既有表单的集成点。建议交付顺序：列表+删除 → 新增（文件/URL 双分支）→ 详情+下载/复制 → 删除被引用与集成点回归。

**裁决点（需拍板）**：

1. **checksum 前端算还是后端算**：ngx=后端算（上传时按算法生成，前端只选算法+可选填值）。建议对齐后端；若 antd 侧想「上传前预览哈希」需另定方案且不改变后端口径。
2. **文件直传通道**：multipart 上传是否从 ui-antd 直连后端（含两步保存与失败回滚语义），还是经 BFF/代理转发；以及文件大小上限要不要在前端设（ngx OTA 未设上限，resources library 的 maxResourceSize 不适用此处）。
3. **device-profile/device 表单的 OTA 选择器是否随 M13 一起动**：选择器 + 「变更前 N 台设备确认」是 OTA 消费闭环的一半；随 M13 一起补=闭环完整但增工作量，后置=需在 spec 登记为依赖项。
4. **删除被引用的交互**：等价（提交后吃外键报错）还是增强（前端预检引用并给行内禁用/提示）。建议首版等价。
5. **编辑保真度**：ngx 保存后除 description 全锁死（前端锁 + 警示文案）。等价=锁死；增强（如允许改 tag）需后端配合，不建议进 M13。
6. **详情页形态与 VC tab**：OTA 详情是否保留独立路由页（ngx 抽屉+独立页双入口）；Version Control tab 归 M13 还是划给 M14 VC 独立页。
