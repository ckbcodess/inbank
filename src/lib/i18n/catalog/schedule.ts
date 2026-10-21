import type { Entry } from "./types";

/** Schedule Payment, opened from a completed payment. Names, amounts, accounts and dates are customer data and stay as they are. */
const schedule: Entry[] = [
  ["Schedule Summary", "Récapitulatif de la planification", "Resumen de la programación", "计划摘要"],
  ["Back to the schedule", "Retour à la planification", "Volver a la programación", "返回计划"],
  ["Continue to Summary", "Continuer vers le récapitulatif", "Continuar al resumen", "继续查看摘要"],
  ["View scheduled payments", "Voir les paiements programmés", "Ver pagos programados", "查看预约付款"],
  ["We’ll send {0} to {1} {2}.", "Nous enverrons {0} à {1} {2}.", "Enviaremos {0} a {1} {2}.", "我们将向 {1} 发送 {0}，{2}。"],
  ["{0}, starting {1}", "{0}, à partir du {1}", "{0}, a partir del {1}", "{0}，自 {1} 起"],
  ["on {0}", "le {0}", "el {0}", "于 {0}"],
  ["Scheduled Payment Details", "Détails du paiement programmé", "Detalles del pago programado", "预约付款详情"],
  ["New Scheduled Payment", "Nouveau paiement programmé", "Nuevo pago programado", "新增预约付款"],
  ["Scheduled Payment Summary", "Récapitulatif du paiement programmé", "Resumen del pago programado", "预约付款摘要"],
  ["Cancelled. {0} won't be paid again. You can set it up again anytime.", "Annulé. {0} ne sera plus payé. Vous pouvez le reprogrammer à tout moment.", "Cancelado. {0} no se pagará más. Puedes volver a programarlo cuando quieras.", "已取消。{0} 将不再支付。您随时可以重新设置。"],
  ["Cancel Scheduled Payment", "Annuler le paiement programmé", "Cancelar pago programado", "取消预约付款"],
  ["Set up a scheduled payment", "Programmer un paiement", "Programar un pago", "设置预约付款"],
];

export default schedule;
