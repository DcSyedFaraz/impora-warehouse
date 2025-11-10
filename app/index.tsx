import React, { memo, useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
  Modal,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";

// Types
type ProductType = "basisstation" | "james_uhr";
type FormType = "accountQR" | "verpackung" | "imeiQR";

interface ModalState {
  visible: boolean;
  heading: string;
  message: string;
}

// Constants
const APP_VERSION = "2.2.2";
const LOGO_URL =
  "https://impora-hausnotruf.de/wp-content/uploads/2025/02/impora-hausnotruf-logo.webp";

const API_CONFIG = {
  imageUploadEndpoint:
    "https://impora-hausnotruf.de/wp-json/wc/v3/app-api/upload-image",
  webhookEndpoint: "https://hook.eu1.make.com/iwhcukw7w37ttjaa8c02oikgyo3wsh16",
  credentials: {
    username: "ck_470e9a3328471b032538dc5a5240d0da9bbf828d",
    password: "cs_73664c5f2947028e89a3cf7e0e44dc90c981f5b9",
  },
};
// ────────────────────────────────────────────────────────────
// Optimised text input: local state ➜ commit on blur only
// ────────────────────────────────────────────────────────────
const InputField = memo(
  ({
    label,
    value,
    onChangeValue,
    placeholder,
    iconName,
    keyboardType = "default",
    maxLength,
  }: {
    label: string;
    value: string;
    onChangeValue: (t: string) => void;
    placeholder: string;
    iconName: any;
    keyboardType?: any;
    maxLength?: number;
  }) => {
    const [local, setLocal] = useState(value);
    useEffect(() => setLocal(value), [value]);
    return (
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>{label}</Text>
        <View style={styles.inputWrapper}>
          <Ionicons
            name={iconName}
            size={20}
            color="#3E7BFA"
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder={placeholder}
            value={local}
            onChangeText={setLocal} /* local typing only */
            onEndEditing={() => onChangeValue(local)} /* commit */
            placeholderTextColor="#A0A0A0"
            keyboardType={keyboardType}
            maxLength={maxLength}
          />
        </View>
      </View>
    );
  }
);

export default function ImporaUploadScreen() {
  // State management
  const [selectedProduct, setSelectedProduct] = useState<ProductType | null>(
    null
  );
  const [selectedForm, setSelectedForm] = useState<FormType | null>(null);
  const [formData, setFormData] = useState({
    numberValue: "",
    qrValue: "",
    imeiValue: "",
  });
  const [images, setImages] = useState({
    imageUri1: null as string | null,
    imageUri2: null as string | null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [modal, setModal] = useState<ModalState>({
    visible: false,
    heading: "",
    message: "",
  });

  // Rücknahme state
  const [rucknahmeModalVisible, setRucknahmeModalVisible] = useState(false);
  const [rucknahmeQrCode, setRucknahmeQrCode] = useState("");
  const [rucknahmeBearbeiter, setRucknahmeBearbeiter] = useState("");
  const [rucknahmeNotizen, setRucknahmeNotizen] = useState("");
  const [rucknahmeLoading, setRucknahmeLoading] = useState(false);
  const [rucknahmeImages, setRucknahmeImages] = useState<(string | null)[]>([
    null,
    null,
    null,
  ]);

  // Label erzeugen state
  const [labelErzeugenModalVisible, setLabelErzeugenModalVisible] = useState(false);
  const [labelErzeugenQrCode, setLabelErzeugenQrCode] = useState("");
  const [labelErzeugenLoading, setLabelErzeugenLoading] = useState(false);

  // Utility functions
  const showModal = (heading: string, message: string) => {
    setModal({ visible: true, heading, message });
  };

  const hideModal = () => {
    setModal({ ...modal, visible: false });
  };

  const resetForm = () => {
    setFormData({ numberValue: "", qrValue: "", imeiValue: "" });
    setImages({ imageUri1: null, imageUri2: null });
  };

  const resetAll = () => {
    setSelectedForm(null);
    resetForm();
  };

  // Product and form handlers
  const handleProductChange = (product: ProductType) => {
    setSelectedProduct(product);
    resetAll();
  };

  const handleFormChange = (newForm: FormType) => {
    setSelectedForm(newForm);
    resetForm();
  };

  // const updateFormData = (field: keyof typeof formData, value: string) => {
  //   setFormData((prev) => ({ ...prev, [field]: value }));
  // };
  const updateFormData = useCallback(
    (field: keyof typeof formData, value: string) =>
      setFormData((prev) => ({ ...prev, [field]: value })),
    []
  );

  // Image handling
  const requestImagePermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    // const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showModal("Permission Error", "Permission to access camera was denied.");
      return false;
    }
    return true;
  };

  const pickImage = async (imageKey: "imageUri1" | "imageUri2") => {
    if (!(await requestImagePermission())) return;

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 1,
    });
    // const result = await ImagePicker.launchImageLibraryAsync({
    //   mediaTypes: ["images"],
    //   allowsEditing: false,
    //   quality: 1,
    // });

    if (!result.canceled && result.assets?.[0]) {
      setImages((prev) => ({ ...prev, [imageKey]: result.assets[0].uri }));
    }
  };

  const removeImage = (imageKey: "imageUri1" | "imageUri2") => {
    setImages((prev) => ({ ...prev, [imageKey]: null }));
  };

  // Rücknahme image handling
  const pickRucknahmeImage = async (index: number) => {
    if (!(await requestImagePermission())) return;

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled && result.assets?.[0]) {
      setRucknahmeImages((prev) => {
        const newImages = [...prev];
        newImages[index] = result.assets[0].uri;
        return newImages;
      });
    }
  };

  const removeRucknahmeImage = (index: number) => {
    setRucknahmeImages((prev) => {
      const newImages = [...prev];
      newImages[index] = null;
      return newImages;
    });
  };

  // Validation
  const validateForm = (): { isValid: boolean; message?: string } => {
    if (selectedForm === "imeiQR" && !formData.imeiValue) {
      return { isValid: false, message: "Please enter IMEI." };
    }

    if (
      selectedForm === "accountQR" &&
      (!formData.numberValue || !formData.qrValue)
    ) {
      return { isValid: false, message: "Please fill in all required fields." };
    }

    if (selectedForm === "verpackung") {
      if (selectedProduct === "basisstation" && !images.imageUri1) {
        return { isValid: false, message: "Please upload an image." };
      }
      if (
        selectedProduct === "james_uhr" &&
        (!images.imageUri1 || !images.imageUri2)
      ) {
        return { isValid: false, message: "Please upload both images." };
      }
    }

    return { isValid: true };
  };

  // API functions
  const uploadImages = async (): Promise<string[]> => {
    if (!images.imageUri1 && !images.imageUri2) {
      return [];
    }

    const formData = new FormData();

    if (images.imageUri1) {
      const imageInfo1 = {
        uri: images.imageUri1,
        name: "image1.jpg",
        type: "image/jpeg",
      };
      formData.append("image[]", imageInfo1 as any);
    }

    if (images.imageUri2) {
      const imageInfo2 = {
        uri: images.imageUri2,
        name: "image2.jpg",
        type: "image/jpeg",
      };
      formData.append("image[]", imageInfo2 as any);
    }
    console.log("Uploading images:", formData);

    const auth =
      "Basic " +
      btoa(
        `${API_CONFIG.credentials.username}:${API_CONFIG.credentials.password}`
      );

    const response = await fetch(API_CONFIG.imageUploadEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "multipart/form-data",
        Authorization: auth,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Image upload failed: ${response.status}`);
    }

    const result = await response.json();
    console.log("Image upload response:", result);

    if (!result.success || !result.urls) {
      throw new Error("Image upload failed - invalid response format");
    }

    return result.urls;
  };

  const buildPayload = (uploadedImageUrls: string[]) => {
    const basePayload = {
      product_way: selectedProduct,
    };

    switch (selectedForm) {
      case "imeiQR":
        return {
          ...basePayload,
          imei: formData.imeiValue,
          qrCode: formData.qrValue,
          way: "imei-qr-code",
        };

      case "accountQR":
        return {
          ...basePayload,
          account_id: formData.numberValue,
          qrCode: formData.qrValue,
          way: "account-id-with-qr-code",
        };

      case "verpackung":
        if (selectedProduct === "basisstation") {
          return {
            ...basePayload,
            imageLink: uploadedImageUrls[0],
            way: "picutre-box",
          };
        } else {
          return {
            ...basePayload,
            imeiImage: uploadedImageUrls[0],
            qrCodeImage: uploadedImageUrls[1],
            way: "picutre-box",
          };
        }

      default:
        throw new Error("Invalid form type");
    }
  };

  const sendToWebhook = async (payload: any) => {
    const response = await fetch(API_CONFIG.webhookEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Webhook request failed: ${response.status}`);
    }

    const result = await response.text();
    if (result !== "done") {
      throw new Error(`Server response: ${result}`);
    }
  };

  // Main submit handler
  const handleSend = async () => {
    const validation = validateForm();
    if (!validation.isValid) {
      showModal("Missing Information", validation.message!);
      return;
    }

    setIsLoading(true);

    try {
      const uploadedImageUrls = await uploadImages();
      const payload = buildPayload(uploadedImageUrls);

      console.log("Payload to send:", payload);

      await sendToWebhook(payload);

      showModal(
        "Daten übermittelt",
        "Die Daten wurden erfolgreich übermittelt."
      );
      resetForm();
    } catch (error) {
      const errorStr = error instanceof Error ? error.message : String(error);
      console.error("Error during data submission:", errorStr);
      const errorMessage = errorStr.toLowerCase().includes("server")
        ? `Daten konnten nicht übermittelt werden! Server response: ${errorStr}`
        : "Daten konnten nicht übermittelt werden!";
      showModal("Error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Upload Rücknahme images
  const uploadRucknahmeImages = async (): Promise<string[]> => {
    const imagesToUpload = rucknahmeImages.filter((img) => img !== null);
    if (imagesToUpload.length === 0) {
      return [];
    }

    const formData = new FormData();

    imagesToUpload.forEach((imageUri, idx) => {
      const imageInfo = {
        uri: imageUri,
        name: `rucknahme_image${idx + 1}.jpg`,
        type: "image/jpeg",
      };
      formData.append("image[]", imageInfo as any);
    });

    console.log("Uploading Rücknahme images:", imagesToUpload.length);

    const auth =
      "Basic " +
      btoa(
        `${API_CONFIG.credentials.username}:${API_CONFIG.credentials.password}`
      );

    const response = await fetch(API_CONFIG.imageUploadEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "multipart/form-data",
        Authorization: auth,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Image upload failed: ${response.status}`);
    }

    const result = await response.json();
    console.log("Rücknahme image upload response:", result);

    if (!result.success || !result.urls) {
      throw new Error("Image upload failed - invalid response format");
    }

    return result.urls;
  };

  // Rücknahme submit handler
  const handleRucknahmeSubmit = async () => {
    if (!rucknahmeQrCode.trim() || !rucknahmeBearbeiter.trim()) {
      showModal("Fehlende Informationen", "Bitte füllen Sie alle Felder aus.");
      return;
    }

    setRucknahmeLoading(true);

    try {
      // Upload images first if any exist
      const uploadedImageUrls = await uploadRucknahmeImages();

      const payload: any = {
        qrCode: rucknahmeQrCode,
        bearbeiter: rucknahmeBearbeiter,
        notizen: rucknahmeNotizen,
      };

      // Add image URLs to payload if any were uploaded
      if (uploadedImageUrls.length > 0) {
        payload.images = uploadedImageUrls;
      }

      const response = await fetch(
        "https://hook.eu1.make.com/adlse6tyzwpvs1cv356xmxyfm7hvbicq",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const responseText = await response.text();
      console.log("responseText", responseText);
      console.log("response.status", response.status);

      // Handle 400 error - keep modal open with data, preserve all fields and images
      if (response.status === 400) {
        showModal("Fehler", responseText);
        setRucknahmeLoading(false); // Stop loading state
        return; // Don't close modal or reset form - keep all data
      }

      // Only proceed with success handling for 200 status
      if (response.status === 200) {
        // Close Rücknahme modal first
        setRucknahmeModalVisible(false);

        // Show response modal after a brief delay to ensure Rücknahme modal closes
        setTimeout(() => {
          showModal("Erfolgreich", responseText);
        }, 300);

        // Reset Rücknahme form only on success
        setRucknahmeQrCode("");
        setRucknahmeBearbeiter("");
        setRucknahmeNotizen("");
        setRucknahmeImages([null, null, null]);
      } else {
        // For other error statuses, show error but keep form data
        showModal("Fehler", responseText);
        setRucknahmeLoading(false);
      }
    } catch (error) {
      const errorStr = error instanceof Error ? error.message : String(error);
      console.error("Error during Rücknahme submission:", errorStr);
      showModal("Error", "Daten konnten nicht übermittelt werden!");
    } finally {
      setRucknahmeLoading(false);
    }
  };

  // Label erzeugen submit handler
  const handleLabelErzeugenSubmit = async () => {
    if (!labelErzeugenQrCode.trim()) {
      showModal("Fehlende Informationen", "Bitte geben Sie einen QR Code ein.");
      return;
    }

    setLabelErzeugenLoading(true);

    try {
      const payload = {
        qrCode: labelErzeugenQrCode,
        label_erzeugen: true,
      };

      const response = await fetch(
        "https://hook.eu1.make.com/adlse6tyzwpvs1cv356xmxyfm7hvbicq",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const responseText = await response.text();
      console.log("Label erzeugen responseText", responseText);
      console.log("Label erzeugen response.status", response.status);

      // Handle 400 error - keep modal open with data
      if (response.status === 400) {
        showModal("Fehler", responseText);
        setLabelErzeugenLoading(false); // Stop loading state
        return; // Don't close modal or reset form - keep all data
      }

      // Handle 200 success - close modal and go to main page
      if (response.status === 200) {
        // Close Label erzeugen modal first
        setLabelErzeugenModalVisible(false);

        // Show response modal after a brief delay to ensure modal closes
        setTimeout(() => {
          showModal("Erfolgreich", responseText);
        }, 300);

        // Reset form only on success
        setLabelErzeugenQrCode("");
      } else {
        // For other error statuses, show error but keep form data
        showModal("Fehler", responseText);
        setLabelErzeugenLoading(false);
      }
    } catch (error) {
      const errorStr = error instanceof Error ? error.message : String(error);
      console.error("Error during Label erzeugen submission:", errorStr);
      showModal("Error", "Daten konnten nicht übermittelt werden!");
    } finally {
      setLabelErzeugenLoading(false);
    }
  };

  // Render functions
  const renderProductSelection = () => (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.selectionContainer}>
        <Image source={{ uri: LOGO_URL }} style={styles.selectionLogo} />
        {/* <TouchableOpacity
          style={[styles.selectionButton, styles.labelErzeugenButton]}
          onPress={() => setLabelErzeugenModalVisible(true)}
        >
          <Text style={styles.selectionButtonText}>Label erzeugen</Text>
        </TouchableOpacity> */}
        <TouchableOpacity
          style={styles.selectionButton}
          onPress={() => handleProductChange("basisstation")}
        >
          <Text style={styles.selectionButtonText}>Basisstation</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.selectionButton}
          onPress={() => handleProductChange("james_uhr")}
        >
          <Text style={styles.selectionButtonText}>JAMES Uhr</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.selectionButton, styles.rucknahmeButton]}
          onPress={() => setRucknahmeModalVisible(true)}
        >
          <Text style={styles.selectionButtonText}>Rücknahme</Text>
        </TouchableOpacity>
        <Text style={styles.versionText}>Version {APP_VERSION}</Text>
      </View>
    </SafeAreaView>
  );

  const renderFormOptions = () => {
    const options =
      selectedProduct === "basisstation"
        ? [
            { key: "accountQR" as FormType, label: "Account ID & QR Code" },
            {
              key: "verpackung" as FormType,
              label: "Verpackungsbild verarbeiten",
            },
          ]
        : [
            { key: "imeiQR" as FormType, label: "IMEI & QR Code" },
            {
              key: "verpackung" as FormType,
              label: "Verpackungsbild verarbeiten",
            },
          ];

    return (
      <View style={styles.formOptionsContainer}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.key}
            style={styles.formOptionButton}
            onPress={() => handleFormChange(option.key)}
          >
            <Text style={styles.formOptionButtonText}>{option.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderTextInput = (
    label: string,
    value: string,
    onChangeText: (text: string) => void,
    placeholder: string,
    iconName: any,
    keyboardType: any = "default",
    maxLength?: number
  ) => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.inputWrapper}>
        <Ionicons
          name={iconName}
          size={20}
          color="#3E7BFA"
          style={styles.inputIcon}
        />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          placeholderTextColor="#A0A0A0"
          keyboardType={keyboardType}
          maxLength={maxLength}
        />
      </View>
    </View>
  );

  const renderImageUpload = (
    label: string,
    imageUri: string | null,
    onPress: () => void,
    onRemove: () => void,
    buttonText: string
  ) => (
    <View style={styles.imageSection}>
      <Text style={styles.inputLabel}>{label}</Text>
      {imageUri ? (
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUri }} style={styles.previewImage} />
          <TouchableOpacity style={styles.removeImageButton} onPress={onRemove}>
            <Ionicons name="close-circle" size={24} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.uploadButton} onPress={onPress}>
          <Ionicons name="camera-outline" size={28} color="#3E7BFA" />
          <Text style={styles.uploadButtonText}>{buttonText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderFormInputs = () => {
    if (selectedForm === "imeiQR" && selectedProduct === "james_uhr") {
      return (
        <>
          {/* {renderTextInput(
            "IMEI",
            formData.imeiValue,
            (text) => updateFormData("imeiValue", text),
            "Enter IMEI",
            "keypad-outline",
            "number-pad",
            15
          )}
          {renderTextInput(
            "QR Code",
            formData.qrValue,
            (text) => updateFormData("qrValue", text),
            "Enter QR Code",
            "qr-code-outline"
          )} */}
          <InputField
            label="IMEI"
            value={formData.imeiValue}
            onChangeValue={(t) => updateFormData("imeiValue", t)}
            placeholder="Enter IMEI"
            iconName="keypad-outline"
            keyboardType="number-pad"
            maxLength={15}
          />
          <InputField
            label="QR Code"
            value={formData.qrValue}
            onChangeValue={(t) => updateFormData("qrValue", t)}
            placeholder="Enter QR Code"
            iconName="qr-code-outline"
          />
        </>
      );
    }

    if (selectedForm === "accountQR" && selectedProduct === "basisstation") {
      return (
        <>
          {/* {renderTextInput(
            "Account ID",
            formData.numberValue,
            (text) => updateFormData("numberValue", text),
            "Enter Account ID",
            "keypad-outline",
            "number-pad",
            15
          )}
          {renderTextInput(
            "QR Code",
            formData.qrValue,
            (text) => updateFormData("qrValue", text),
            "Enter QR Code",
            "qr-code-outline"
          )} */}
          <InputField
            label="Account ID"
            value={formData.numberValue}
            onChangeValue={(t) => updateFormData("numberValue", t)}
            placeholder="Enter Account ID"
            iconName="keypad-outline"
            keyboardType="number-pad"
            maxLength={15}
          />
          <InputField
            label="QR Code"
            value={formData.qrValue}
            onChangeValue={(t) => updateFormData("qrValue", t)}
            placeholder="Enter QR Code"
            iconName="qr-code-outline"
          />
        </>
      );
    }

    if (selectedForm === "verpackung") {
      if (selectedProduct === "basisstation") {
        return renderImageUpload(
          "Bild hochladen",
          images.imageUri1,
          () => pickImage("imageUri1"),
          () => removeImage("imageUri1"),
          "Upload Photo"
        );
      } else {
        return (
          <>
            {renderImageUpload(
              "IMEI Bild",
              images.imageUri1,
              () => pickImage("imageUri1"),
              () => removeImage("imageUri1"),
              "Upload IMEI Bild"
            )}
            {renderImageUpload(
              "QR Code Bild",
              images.imageUri2,
              () => pickImage("imageUri2"),
              () => removeImage("imageUri2"),
              "Upload QR Code Bild"
            )}
          </>
        );
      }
    }

    return null;
  };

  const renderModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={modal.visible}
      onRequestClose={hideModal}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Ionicons
            name={
              modal.heading === "Daten übermittelt" ||
              modal.heading === "Erfolgreich"
                ? "checkmark-circle"
                : "close-circle"
            }
            size={50}
            color={
              modal.heading === "Daten übermittelt" ||
              modal.heading === "Erfolgreich"
                ? "green"
                : "red"
            }
          />
          <Text style={styles.modalTitle}>{modal.heading}</Text>
          <Text style={styles.modalText}>{modal.message}</Text>
          <TouchableOpacity style={styles.modalButton} onPress={hideModal}>
            <Text style={styles.modalButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderRucknahmeModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={rucknahmeModalVisible}
      onRequestClose={() => setRucknahmeModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.rucknahmeModalContent}>
          <View style={styles.rucknahmeModalHeader}>
            <Text style={styles.modalTitle}>Rücknahme</Text>
            <TouchableOpacity
              style={styles.labelErzeugenIconButton}
              onPress={() => {
                setRucknahmeModalVisible(false);
                setTimeout(() => {
                  setLabelErzeugenModalVisible(true);
                }, 300);
              }}
            >
              <Text style={styles.labelErzeugenButtonText}>Label erzeugen</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>QR Code</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="qr-code-outline"
                size={20}
                color="#3E7BFA"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="QR Code eingeben"
                value={rucknahmeQrCode}
                onChangeText={setRucknahmeQrCode}
                placeholderTextColor="#A0A0A0"
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Bearbeiter</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="person-outline"
                size={20}
                color="#3E7BFA"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Bearbeiter eingeben"
                value={rucknahmeBearbeiter}
                onChangeText={setRucknahmeBearbeiter}
                placeholderTextColor="#A0A0A0"
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Notizen</Text>
            <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
              <Ionicons
                name="document-text-outline"
                size={20}
                color="#3E7BFA"
                style={[styles.inputIcon, styles.textAreaIcon]}
              />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Notizen eingeben (optional)"
                value={rucknahmeNotizen}
                onChangeText={setRucknahmeNotizen}
                placeholderTextColor="#A0A0A0"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Image upload section */}
          <View style={styles.rucknahmeImagesSection}>
            <Text style={styles.inputLabel}>Bilder (Optional)</Text>
            <View style={styles.rucknahmeImagesGrid}>
              {rucknahmeImages.map((imageUri, index) => (
                <View key={index} style={styles.rucknahmeImageSlot}>
                  {imageUri ? (
                    <View style={styles.rucknahmeImageContainer}>
                      <Image
                        source={{ uri: imageUri }}
                        style={styles.rucknahmePreviewImage}
                      />
                      <TouchableOpacity
                        style={styles.rucknahmeRemoveImageButton}
                        onPress={() => removeRucknahmeImage(index)}
                      >
                        <Ionicons
                          name="close-circle"
                          size={24}
                          color="#FF3B30"
                        />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.rucknahmeUploadButton}
                      onPress={() => pickRucknahmeImage(index)}
                    >
                      <Ionicons
                        name="camera-outline"
                        size={32}
                        color="#3E7BFA"
                      />
                      <Text style={styles.rucknahmeUploadText}>
                        Bild {index + 1}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          </View>

          <View style={styles.rucknahmeButtonsContainer}>
            <TouchableOpacity
              style={styles.rucknahmeCancelButton}
              onPress={() => setRucknahmeModalVisible(false)}
              disabled={rucknahmeLoading}
            >
              <Text style={styles.rucknahmeCancelButtonText}>Abbrechen</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.rucknahmeSubmitButton,
                rucknahmeLoading && styles.sendButtonDisabled,
              ]}
              onPress={handleRucknahmeSubmit}
              disabled={rucknahmeLoading}
            >
              {rucknahmeLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons
                    name="send"
                    size={20}
                    color="#FFFFFF"
                    style={styles.sendIcon}
                  />
                  <Text style={styles.sendButtonText}>Senden</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderLabelErzeugenModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={labelErzeugenModalVisible}
      onRequestClose={() => setLabelErzeugenModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.rucknahmeModalContent}>
          <Text style={styles.modalTitle}>Label erzeugen</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>QR Code</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="qr-code-outline"
                size={20}
                color="#3E7BFA"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="QR Code eingeben"
                value={labelErzeugenQrCode}
                onChangeText={setLabelErzeugenQrCode}
                placeholderTextColor="#A0A0A0"
              />
            </View>
          </View>

          <View style={styles.rucknahmeButtonsContainer}>
            <TouchableOpacity
              style={styles.rucknahmeCancelButton}
              onPress={() => setLabelErzeugenModalVisible(false)}
              disabled={labelErzeugenLoading}
            >
              <Text style={styles.rucknahmeCancelButtonText}>Abbrechen</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.rucknahmeSubmitButton,
                labelErzeugenLoading && styles.sendButtonDisabled,
              ]}
              onPress={handleLabelErzeugenSubmit}
              disabled={labelErzeugenLoading}
            >
              {labelErzeugenLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons
                    name="send"
                    size={20}
                    color="#FFFFFF"
                    style={styles.sendIcon}
                  />
                  <Text style={styles.sendButtonText}>Senden</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderMainContent = () => (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Image source={{ uri: LOGO_URL }} style={styles.logo} />
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => setSelectedProduct(null)}
            >
              <Ionicons name="menu" size={24} color="#FFFFFF" />
              <Text style={styles.menuButtonText}>Menü</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formContainer}>
            {!selectedForm && renderFormOptions()}
            {renderFormInputs()}

            {selectedForm && (
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  isLoading && styles.sendButtonDisabled,
                ]}
                onPress={handleSend}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons
                      name="send"
                      size={20}
                      color="#FFFFFF"
                      style={styles.sendIcon}
                    />
                    <Text style={styles.sendButtonText}>Daten senden</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
      {renderModal()}
      {renderRucknahmeModal()}
      {renderLabelErzeugenModal()}
    </SafeAreaView>
  );

  // Main render
  return (
    <>
      {selectedProduct ? renderMainContent() : renderProductSelection()}
      {!selectedProduct && renderRucknahmeModal()}
      {!selectedProduct && renderLabelErzeugenModal()}
      {renderModal()}
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  scrollContainer: {
    flexGrow: 1,
  },
  selectionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  selectionLogo: {
    width: 200,
    height: 70,
    resizeMode: "contain",
    marginBottom: 40,
  },
  selectionButton: {
    width: "80%",
    paddingVertical: 20,
    marginVertical: 10,
    backgroundColor: "#3E7BFA",
    borderRadius: 8,
    alignItems: "center",
  },
  selectionButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  versionText: {
    position: "absolute",
    bottom: 20,
    color: "#666",
    fontSize: 14,
  },
  selectionOptions: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  formOptionsContainer: {
    flexDirection: "column",
    gap: 12,
    marginBottom: 20,
  },
  formOptionButton: {
    width: "100%",
    paddingVertical: 16,
    backgroundColor: "#3E7BFA",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  formOptionButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  menuButton: {
    position: "absolute",
    top: 10,
    right: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#3E7BFA",
    borderRadius: 6,
    zIndex: 10,
  },
  menuButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 30,
    paddingVertical: 10,
    position: "relative",
  },
  logo: {
    width: 180,
    height: 60,
    resizeMode: "contain",
    alignSelf: "center",
    marginBottom: 20,
    marginTop: 20,
  },
  formContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333333",
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    backgroundColor: "#F8F9FA",
  },
  inputIcon: {
    padding: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingRight: 15,
    fontSize: 16,
    color: "#333333",
  },
  imageSection: {
    marginBottom: 25,
  },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#3E7BFA",
    borderRadius: 8,
    backgroundColor: "#F0F7FF",
    padding: 20,
  },
  uploadButtonText: {
    fontSize: 16,
    color: "#3E7BFA",
    fontWeight: "600",
    marginLeft: 8,
  },
  imageContainer: {
    position: "relative",
    alignItems: "center",
    marginTop: 5,
  },
  previewImage: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginTop: 10,
  },
  removeImageButton: {
    position: "absolute",
    top: 20,
    right: 10,
    backgroundColor: "white",
    borderRadius: 15,
    padding: 2,
  },
  sendButton: {
    flexDirection: "row",
    backgroundColor: "#3E7BFA",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#A0A0A0",
  },
  sendIcon: {
    marginRight: 8,
  },
  sendButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  modalContent: {
    width: "80%",
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
    color: "#333",
  },
  modalText: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 20,
    textAlign: "center",
    color: "#555",
  },
  modalButton: {
    backgroundColor: "#3E7BFA",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    shadowColor: "#3E7BFA",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  rucknahmeButton: {
    backgroundColor: "#FF9500",
  },
  labelErzeugenButton: {
    backgroundColor: "#34C759",
  },
  rucknahmeModalContent: {
    width: "90%",
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 16,
    alignItems: "stretch",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  rucknahmeModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  labelErzeugenIconButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#F0F9F4",
  },
  labelErzeugenButtonText: {
    color: "#34C759",
    fontSize: 14,
    fontWeight: "600",
  },
  rucknahmeButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 20,
    width: "100%",
  },
  rucknahmeCancelButton: {
    flex: 1,
    backgroundColor: "#E0E0E0",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  rucknahmeCancelButtonText: {
    color: "#333",
    fontSize: 16,
    fontWeight: "600",
  },
  rucknahmeSubmitButton: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#3E7BFA",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  textAreaWrapper: {
    minHeight: 100,
    alignItems: "flex-start",
  },
  textAreaIcon: {
    paddingTop: 12,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
    paddingBottom: 12,
  },
  rucknahmeImagesSection: {
    marginBottom: 20,
  },
  rucknahmeImagesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-between",
  },
  rucknahmeImageSlot: {
    width: "30%",
    aspectRatio: 1,
  },
  rucknahmeUploadButton: {
    flex: 1,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#3E7BFA",
    borderRadius: 8,
    backgroundColor: "#F0F7FF",
    justifyContent: "center",
    alignItems: "center",
    padding: 10,
  },
  rucknahmeUploadText: {
    fontSize: 12,
    color: "#3E7BFA",
    fontWeight: "600",
    marginTop: 4,
    textAlign: "center",
  },
  rucknahmeImageContainer: {
    position: "relative",
    flex: 1,
  },
  rucknahmePreviewImage: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  rucknahmeRemoveImageButton: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 2,
  },
});
