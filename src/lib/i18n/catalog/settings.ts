import type { Entry } from "./types";

/** Settings modal and sheet: Profile, Security and Alerts. Names, numbers and addresses are customer data and stay as they are. */
const settings: Entry[] = [
  // ── Saved recipients strip and picker (Send & Pay choosers) ──
  ["See all", "Tout voir", "Ver todo", "查看全部"],
  ["saved", "enregistrés", "guardados", "已保存"],
  ["Choose a recipient", "Choisir un bénéficiaire", "Elegir un destinatario", "选择收款人"],
  ["Search by name, bank or number", "Rechercher par nom, banque ou numéro", "Buscar por nombre, banco o número", "按姓名、银行或号码搜索"],
  ["Nobody saved matches that. Clear the search to see everyone.", "Aucun bénéficiaire enregistré ne correspond. Effacez la recherche pour voir tout le monde.", "Nadie guardado coincide. Borra la búsqueda para ver a todos.", "没有匹配的已保存收款人。清除搜索即可查看全部。"],

  ["Search banks", "Rechercher une banque", "Buscar bancos", "搜索银行"],
  ["No bank matches that.", "Aucune banque ne correspond.", "Ningún banco coincide.", "没有匹配的银行。"],

  // ── Short copy ──
  ["Password and sign-in", "Mot de passe et connexion", "Contraseña e inicio de sesión", "密码和登录"],
  ["SMS, email, statements", "SMS, e-mail, relevés", "SMS, correo, extractos", "短信、邮件、对账单"],
  ["From your Ghana Card.", "D’après votre carte Ghana.", "Según tu Ghana Card.", "来自您的加纳卡。"],
  ["For example 024 123 4567.", "Par exemple 024 123 4567.", "Por ejemplo 024 123 4567.", "例如 024 123 4567。"],
  ["A one-time code for every payment.", "Un code à usage unique pour chaque paiement.", "Un código de un solo uso para cada pago.", "每笔付款都需要一次性验证码。"],
  ["On for every customer.", "Activé pour tous les clients.", "Activado para todos los clientes.", "对所有客户开启。"],
  ["Remembered until", "Mémorisé jusqu’au", "Recordado hasta el", "记住至"],
  ["Not remembered", "Non mémorisé", "No recordado", "未记住"],
  ["Every debit and credit.", "Chaque débit et crédit.", "Cada débito y crédito.", "每笔扣款和入账。"],
  ["After each payment.", "Après chaque paiement.", "Después de cada pago.", "每笔付款后。"],
  ["On the 1st of each month.", "Le 1er de chaque mois.", "El día 1 de cada mes.", "每月 1 日。"],
  ["Sign-in and new-device alerts are always on.", "Les alertes de connexion et de nouvel appareil sont toujours activées.", "Las alertas de inicio de sesión y de dispositivo nuevo están siempre activadas.", "登录和新设备提醒始终开启。"],

  // ── Sections ──
  ["You", "Vous", "Tú", "您"],
  ["Safety", "Sécurité", "Seguridad", "安全"],
  ["Profile", "Profil", "Perfil", "个人资料"],
  ["Security", "Sécurité", "Seguridad", "安全"],
  ["Alerts", "Alertes", "Alertas", "提醒"],
  ["Theme and language", "Thème et langue", "Tema e idioma", "主题和语言"],
  ["Language", "Langue", "Idioma", "语言"],
  ["Close settings", "Fermer les paramètres", "Cerrar los ajustes", "关闭设置"],
  ["Back to settings", "Retour aux paramètres", "Volver a los ajustes", "返回设置"],
  ["Theme and language are in the account menu.", "Le thème et la langue se trouvent dans le menu du compte.", "El tema y el idioma están en el menú de la cuenta.", "主题和语言在账户菜单中。"],

  // ── Profile ──
  ["Mobile number", "Numéro de mobile", "Número de móvil", "手机号码"],
  ["Email", "E-mail", "Correo electrónico", "电子邮件"],
  ["Address", "Adresse", "Dirección", "地址"],
  ["Proxy Pay ID", "Identifiant Proxy Pay", "ID de Proxy Pay", "Proxy Pay ID"],
  ["Change", "Modifier", "Cambiar", "更改"],
  ["Copy", "Copier", "Copiar", "复制"],
  ["Proxy ID copied", "Identifiant Proxy copié", "ID de Proxy copiado", "已复制 Proxy ID"],

  // ── Changing a detail ──
  ["Change mobile number", "Modifier le numéro de mobile", "Cambiar el número de móvil", "更改手机号码"],
  ["Change email", "Modifier l’e-mail", "Cambiar el correo electrónico", "更改电子邮件"],
  ["Change address", "Modifier l’adresse", "Cambiar la dirección", "更改地址"],
  ["Code goes to", "Le code est envoyé à", "El código se envía a", "验证码发送至"],
  ["Changing to", "Changement vers", "Cambiando a", "更改为"],
  ["New Mobile Number", "Nouveau numéro de mobile", "Nuevo número de móvil", "新手机号码"],
  ["New Email", "Nouvel e-mail", "Nuevo correo electrónico", "新电子邮件"],
  ["Send code", "Envoyer le code", "Enviar código", "发送验证码"],
  ["Save address", "Enregistrer l’adresse", "Guardar dirección", "保存地址"],
  ["Cancel", "Annuler", "Cancelar", "取消"],
  ["Back", "Retour", "Atrás", "返回"],
  ["Enter your code", "Saisissez votre code", "Introduce tu código", "输入验证码"],
  ["That code isn’t right. Try again.", "Ce code n’est pas correct. Réessayez.", "Ese código no es correcto. Inténtalo de nuevo.", "验证码不正确，请重试。"],
  ["Mobile number changed", "Numéro de mobile modifié", "Número de móvil cambiado", "手机号码已更改"],
  ["Email changed", "E-mail modifié", "Correo electrónico cambiado", "电子邮件已更改"],
  ["Address updated", "Adresse mise à jour", "Dirección actualizada", "地址已更新"],

  // ── Security ──
  ["Password", "Mot de passe", "Contraseña", "密码"],
  ["Sign-in PIN", "Code de connexion", "PIN de acceso", "登录 PIN"],
  ["Reset", "Réinitialiser", "Restablecer", "重置"],
  ["Payment approval", "Approbation des paiements", "Aprobación de pagos", "付款确认"],
  ["Two-step sign-in", "Connexion en deux étapes", "Inicio de sesión en dos pasos", "两步登录"],
  ["This device", "Cet appareil", "Este dispositivo", "此设备"],
  ["Forget this device", "Oublier cet appareil", "Olvidar este dispositivo", "忘记此设备"],
  ["This device will ask for a code next time", "Cet appareil demandera un code la prochaine fois", "Este dispositivo pedirá un código la próxima vez", "下次此设备将要求输入验证码"],
  ["Auto-logout", "Déconnexion automatique", "Cierre de sesión automático", "自动退出"],
  ["5 minutes", "5 minutes", "5 minutos", "5 分钟"],
  ["15 minutes", "15 minutes", "15 minutos", "15 分钟"],
  ["30 minutes", "30 minutes", "30 minutos", "30 分钟"],
  ["Auto-logout updated", "Déconnexion automatique mise à jour", "Cierre de sesión automático actualizado", "自动退出已更新"],

  // ── Change password ──
  ["Change password", "Modifier le mot de passe", "Cambiar la contraseña", "更改密码"],
  ["Current Password", "Mot de passe actuel", "Contraseña actual", "当前密码"],
  ["New Password", "Nouveau mot de passe", "Nueva contraseña", "新密码"],
  ["Confirm New Password", "Confirmer le nouveau mot de passe", "Confirmar la nueva contraseña", "确认新密码"],
  ["At least 8 characters, Upper and lower case, A number, A symbol.", "Au moins 8 caractères, majuscules et minuscules, un chiffre, un symbole.", "Al menos 8 caracteres, mayúsculas y minúsculas, un número, un símbolo.", "至少 8 个字符，包含大小写字母、数字和符号。"],
  ["The passwords don’t match.", "Les mots de passe ne correspondent pas.", "Las contraseñas no coinciden.", "两次输入的密码不一致。"],
  ["Update password", "Mettre à jour le mot de passe", "Actualizar contraseña", "更新密码"],
  ["Password updated", "Mot de passe mis à jour", "Contraseña actualizada", "密码已更新"],

  // ── Alerts ──
  ["SMS alerts", "Alertes SMS", "Alertas por SMS", "短信提醒"],
  ["Email receipts", "Reçus par e-mail", "Recibos por correo", "邮件回执"],
  ["E-statements", "Relevés électroniques", "Extractos electrónicos", "电子对账单"],
  ["Saved", "Enregistré", "Guardado", "已保存"],
];

export default settings;
