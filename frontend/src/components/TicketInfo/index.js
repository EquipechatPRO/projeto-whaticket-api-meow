import React, { useState, useContext } from "react";
import { i18n } from "../../translate/i18n";
import { 
    Avatar, 
    CardHeader, 
    Dialog,
    DialogContent,
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { AuthContext } from "../../context/Auth/AuthContext";

const useStyles = makeStyles((theme) => ({
    // Estilos para o modal da imagem
    imageModal: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    imageModalContent: {
        outline: "none",
        maxWidth: "90vw",
        maxHeight: "90vh",
    },
    expandedImage: {
        width: "100%",
        height: "auto",
        maxWidth: "500px",
        borderRadius: theme.spacing(1),
    },
    clickableAvatar: {
        cursor: "pointer",
        "&:hover": {
            opacity: 0.8,
        },
    },
    ticketInfoContainer: {
        display: "flex",
        alignItems: "center",
        overflow: "hidden",
        flexShrink: 1,
        minWidth: 0,
        flex: 1,
        "& .MuiCardHeader-root": {
            padding: "6px 8px",
            overflow: "hidden",
            width: "100%",
        },
        "& .MuiCardHeader-content": {
            overflow: "hidden",
            minWidth: 0,
        },
        "& .MuiCardHeader-title": {
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            fontSize: "0.95rem",
            maxWidth: "100%",
            display: "block",
        },
        "& .MuiCardHeader-subheader": {
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            fontSize: "0.75rem",
            maxWidth: "100%",
            display: "block",
        },
    },
}));

const TicketInfo = ({ contact, ticket, onClick }) => {
    const classes = useStyles();
    const [amount, setAmount] = useState("");
    const { user } = useContext(AuthContext);
    const [imageModalOpen, setImageModalOpen] = useState(false); // Estado para o modal da imagem

    // Função para abrir modal da imagem
    const handleImageClick = (e) => {
        e.stopPropagation(); // Prevenir que o clique no avatar execute outros handlers
        if (contact?.urlPicture) {
            setImageModalOpen(true);
        }
    };

    // Função para fechar modal da imagem
    const handleImageModalClose = () => {
        setImageModalOpen(false);
    };

    const renderCardReader = () => {
        return (
            <CardHeader
                onClick={onClick}
                style={{ cursor: "pointer" }}
                titleTypographyProps={{ noWrap: true }}
                subheaderTypographyProps={{ noWrap: true }}
                avatar={
                    <Avatar 
                        src={contact?.urlPicture} 
                        alt="contact_image" 
                        className={classes.clickableAvatar}
                        onClick={handleImageClick}
                        style={{ backgroundColor: !contact?.urlPicture ? '#3f51b5' : undefined, color: '#fff', fontWeight: 'bold' }}
                    >
                        {!contact?.urlPicture && contact?.name
                            ? contact.name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('')
                            : null}
                    </Avatar>
                }
                title={`${contact?.name || '(sem contato)'} #${ticket?.id}`}
                subheader={[
                    ticket?.user && `${i18n.t("messagesList.header.assignedTo")} ${ticket?.user?.name}`,
                    contact?.contactWallets && contact.contactWallets.length > 0
                        ? `• ${i18n.t("wallets.wallet")}: ${contact.contactWallets[0].wallet?.name || 'N/A'}`
                        : null
                ].filter(Boolean).join(' ')}
            />
        );
    }

    const handleChange = (event) => {
        const value = event.target.value;
        setAmount(value);
    }

    return (
        <React.Fragment>
            <div className={classes.ticketInfoContainer}>
                {renderCardReader()}
            </div>

            {/* Modal da Imagem */}
            <Dialog
                open={imageModalOpen}
                onClose={handleImageModalClose}
                className={classes.imageModal}
                maxWidth="md"
                fullWidth
            >
                <DialogContent className={classes.imageModalContent}>
                    <img 
                        src={contact?.urlPicture} 
                        alt={contact?.name || "Foto do contato"}
                        className={classes.expandedImage}
                    />
                </DialogContent>
            </Dialog>
        </React.Fragment>
    );
};

export default TicketInfo;