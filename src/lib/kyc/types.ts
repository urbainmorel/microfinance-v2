export type ProfileData = {
  id: string;
  firstname: string;
  lastname: string;
  country: string | null;
  id_type: string | null;
  kyc_status: string | null;
};

export type SignedDocUrls = {
  frontUrl: string;
  backUrl: string | null;
};

export type KycDocRow = {
  id: string;
  doc_type: string;
  url: string | null;
};
