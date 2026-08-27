import type {
    Sale,
} from "../../models/sale/Sale";
import {
    getDocumentsForTransaction,
} from "../../models/document/DocumentRepository";
import ReceiptPage from "../receipt/ReceiptPage";

type RefundVoucherSummary = {
    number: string;
    amount: number;
};

type SaleCompletePageProps = {
    sale: Sale;
    onNewSale: () => void;
    refundVoucher?: RefundVoucherSummary | null;
};

function SaleCompletePage({
    sale,
    onNewSale,
    refundVoucher = null,
}: SaleCompletePageProps) {
    const accountingDocument =
        getDocumentsForTransaction(
            sale.id,
        )[0] ?? null;

    return (
        <ReceiptPage
            sale={sale}
            document={
                accountingDocument
            }
            onBack={
                onNewSale
            }
            postTransaction
            onNewSale={
                onNewSale
            }
            refundVoucher={
                refundVoucher
            }
        />
    );
}

export default SaleCompletePage;
