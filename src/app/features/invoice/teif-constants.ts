/**
 * teif-constants.ts
 *
 * Constantes de référence TEIF (Tables de codes) partagées entre
 * InvoiceAddComponent, InvoiceConsultComponent et EDocComponent.
 *
 * Migrées depuis les tableaux déclarés dans les controllers AngularJS
 * (AddInvoiceCtrl, ConsultInvoiceCtrl, EDocController) — identiques dans les trois.
 */

export interface CodeLabel { id: string; name: string; }

export const TYPE_FACT: CodeLabel[] = [
  { id: 'I-11', name: 'Facture' },
  { id: 'I-12', name: "Facture d'avoir" },
  { id: 'I-13', name: "Note d'honoraire" },
  { id: 'I-14', name: 'Décompte (marché public)' },
  { id: 'I-15', name: 'Facture Export' },
  { id: 'I-16', name: 'Bon de Commande' },
];

export const TYPE_MONTANT: CodeLabel[] = [
  { id: 'I-171', name: "Montant total HT de l'article" },
  { id: 'I-172', name: 'Montant total HT des articles' },
  { id: 'I-173', name: 'Montant payé' },
  { id: 'I-174', name: 'Montant de la charge/service' },
  { id: 'I-175', name: 'Montant total des charges/services' },
  { id: 'I-176', name: 'Montant total HT facture' },
  { id: 'I-177', name: 'Montant base taxe' },
  { id: 'I-178', name: 'Montant Taxe' },
  { id: 'I-179', name: "Capital de l'entreprise" },
  { id: 'I-180', name: 'Montant Total TTC facture' },
  { id: 'I-181', name: 'Montant total Taxe' },
  { id: 'I-182', name: 'Montant total base taxe' },
  { id: 'I-183', name: 'Montant HT article unitaire' },
  { id: 'I-184', name: 'Montant total TTC des charges/services' },
  { id: 'I-185', name: 'Montant total exonéré' },
  { id: 'I-186', name: 'Montant de crédit' },
  { id: 'I-187', name: 'Montant objet de suspension de la TVA' },
  { id: 'I-188', name: "Montant net de l'article" },
];

export const TYPE_TAXE: CodeLabel[] = [
  { id: 'I-161',  name: 'Droit de consommation' },
  { id: 'I-162',  name: 'Taxe professionnelle de compétitivité FODEC' },
  { id: 'I-163',  name: 'Taxe sur les emballages métalliques' },
  { id: 'I-164',  name: "Taxe pour la protection de l'environnement TPE" },
  { id: 'I-165',  name: 'Taxe au profit du fonds de développement de la compétitivité dans le secteur du tourisme (FODET)' },
  { id: 'I-166',  name: 'Taxe sur les climatiseurs' },
  { id: 'I-167',  name: 'Taxes sur les lampes et les tubes' },
  { id: 'I-168',  name: 'Taxes sur fruit et légumes (TFL) non soumis à la TVA' },
  { id: 'I-169',  name: 'Taxes sur les produits de la pèche (non soumis à la TVA)' },
  { id: 'I-160',  name: 'Taxes RB (non soumis à la TVA)' },
  { id: 'I-1601', name: 'Droit de timbre' },
  { id: 'I-1602', name: 'TVA' },
  { id: 'I-1603', name: 'Autre' },
];

export const TYPE_PARTNER: CodeLabel[] = [
  { id: 'I-61', name: 'Acheteur' },
  { id: 'I-62', name: 'Fournisseur' },
  { id: 'I-63', name: 'Vendeur' },
  { id: 'I-64', name: 'Client' },
  { id: 'I-65', name: 'Receveur Facture' },
  { id: 'I-66', name: 'Emetteur Facture' },
  { id: 'I-67', name: 'Exportateur' },
  { id: 'I-68', name: 'Importateur' },
  { id: 'I-69', name: 'Inspecteur' },
];

export const TYPE_DATE: CodeLabel[] = [
  { id: 'I-32', name: 'Date limite de paiement' },
  { id: 'I-33', name: 'Date de confirmation' },
  { id: 'I-34', name: "Date d'expiration" },
  { id: 'I-35', name: 'Date du fichier joint' },
  { id: 'I-36', name: 'Période de facturation' },
  { id: 'I-37', name: 'Date de la génération de la réference' },
  { id: 'I-38', name: 'Autre' },
];

export const TYPE_MATRICULE: CodeLabel[] = [
  { id: 'I-01', name: 'Matricule Fiscale' },
  { id: 'I-02', name: "Carte d'identite nationale" },
  { id: 'I-03', name: 'Carte de sejour' },
  { id: 'I-04', name: 'Matricule Fiscale non tunisien' },
];

export const LOCATION_TYPES: CodeLabel[] = [
  { id: 'I-51', name: 'Adresse de livraison' },
  { id: 'I-52', name: 'Adresse de paiement' },
  { id: 'I-53', name: 'Pays de provenance' },
  { id: 'I-54', name: "Pays d'achat" },
  { id: 'I-55', name: 'Pays' },
  { id: 'I-56', name: 'Ville' },
  { id: 'I-57', name: 'Adresse de courrier' },
  { id: 'I-58', name: 'Pays première destination' },
  { id: 'I-59', name: 'Pays destination définitive' },
];

export const CONTACT_TYPES: CodeLabel[] = [
  { id: 'I-91', name: 'Contact Technique' },
  { id: 'I-92', name: 'Contact juridique' },
  { id: 'I-93', name: 'Contact Commercial' },
  { id: 'I-94', name: 'Autre' },
];

export const COM_MEANS_TYPES: CodeLabel[] = [
  { id: 'I-101', name: 'Telephone' },
  { id: 'I-102', name: 'Fax' },
  { id: 'I-103', name: 'Email' },
  { id: 'I-104', name: 'Autre' },
];

export const PAYMENT_TERMS: CodeLabel[] = [
  { id: 'I-111', name: 'Basic' },
  { id: 'I-112', name: 'A une date fixe' },
  { id: 'I-113', name: 'Avec une période de grâce' },
  { id: 'I-114', name: 'Par virement bancaire' },
  { id: 'I-115', name: 'Exclusivement aux bureaux postaux' },
  { id: 'I-116', name: 'Autre' },
  { id: 'I-117', name: 'Par facilité' },
];

export const PAYMENT_CONDITIONS: CodeLabel[] = [
  { id: 'I-121', name: 'Paiement directe' },
  { id: 'I-122', name: 'A travers une institution financière specifique' },
  { id: 'I-123', name: 'Quelle que soit la banque' },
  { id: 'I-124', name: 'Autre' },
];

export const PAYMENT_MEANS: CodeLabel[] = [
  { id: 'I-131', name: 'Espece' },
  { id: 'I-132', name: 'Cheque' },
  { id: 'I-133', name: 'Cheque certifie' },
  { id: 'I-134', name: 'Prélèvement bancaire' },
  { id: 'I-135', name: 'Virement bancaire' },
  { id: 'I-136', name: 'Swift' },
  { id: 'I-137', name: 'Autre' },
];

export const FINANCIAL_INSTIT: CodeLabel[] = [
  { id: 'I-141', name: 'Poste' },
  { id: 'I-142', name: 'Banque' },
  { id: 'I-143', name: 'Autre' },
];

export const REFERENCE_TYPES: CodeLabel[] = [
  { id: 'I-81',  name: 'Identifiant du compte client' },
  { id: 'I-811', name: 'Mode de connexion client' },
  { id: 'I-812', name: 'Rang du compte client' },
  { id: 'I-813', name: 'Profil du compte client' },
  { id: 'I-814', name: 'Code du client' },
  { id: 'I-815', name: 'Registre de commerce' },
  { id: 'I-816', name: "Catégorie de l'entreprise" },
  { id: 'I-817', name: "Objet de la facture" },
  { id: 'I-818', name: "Numéro CNSS" },
  { id: 'I-82',  name: 'Reference Banque' },
  { id: 'I-83',  name: 'Numero bon de commande' },
  { id: 'I-84',  name: 'Numero bon de livraison' },
  { id: 'I-85',  name: "Numero de l'autorisation de la suspension de la TVA" },
  { id: 'I-86',  name: 'Numero de décompte' },
  { id: 'I-87',  name: 'Numero de marché public' },
  { id: 'I-871', name: 'Nom marché public' },
  { id: 'I-88',  name: 'Référence TTN de la Facture' },
  { id: 'I-89',  name: 'Numero de la facture referenciee' },
  { id: 'I-80',  name: 'Autre' },
];

export const ALLOWANCE_TYPES: CodeLabel[] = [
  { id: 'I-151', name: 'Reduction' },
  { id: 'I-152', name: 'Ristourne' },
  { id: 'I-153', name: 'Rabais' },
  { id: 'I-154', name: 'Redevance sur les telecommunications' },
  { id: 'I-155', name: 'Autre' },
];

export const FTX_SUBJECT_CODES: CodeLabel[] = [
  { id: 'I-41', name: 'Description marchandise / service' },
  { id: 'I-42', name: 'Description acquittement' },
  { id: 'I-43', name: 'Conditions du prix' },
  { id: 'I-44', name: "Description de l'erreur" },
  { id: 'I-45', name: 'Periode de temps' },
  { id: 'I-46', name: 'Formule de calcul du prix' },
  { id: 'I-47', name: 'Code incoterme livraison' },
  { id: 'I-48', name: 'Observation' },
];

export const FORMAT_DATES: CodeLabel[] = [
  { id: 'ddMMyy',       name: 'ddMMyy' },
  { id: 'ddMMyy-ddMMyy', name: 'ddMMyy-ddMMyy' },
];

/** Trouve le label d'un code dans une liste. Remplace `$filter('filter')({id: code})`. */
export function labelOf(list: CodeLabel[], id: string): string {
  return list.find(c => c.id === id)?.name ?? id;
}
